// Per-message processing pipeline: parse → validate → redact+write → DLQ.
//
// `processMessage` never throws. A throw would crash the kafkajs consumer
// loop and stall ingestion; instead every failure path resolves to either
// a successful write or a DLQ route, so the consumer always makes progress.

import { z } from "zod";
import { KafkaLogPayloadSchema } from "@helix/types";
import type { Db } from "@helix/db";
import { DeadLetterQueue, type DlqReason } from "./dlq.js";
import { logger } from "./logger.js";
import { logsWritten, messagesDlq, writeDuration } from "./metrics.js";
import { writeInferenceLog } from "./writer.js";

// PostgreSQL write is retried up to this many times before the message is
// considered undeliverable and routed to the DLQ (ai-workflow-rules.md).
const MAX_WRITE_ATTEMPTS = 3;

export async function processMessage(
  db: Db,
  dlq: DeadLetterQueue,
  rawValue: string | null,
): Promise<void> {
  if (rawValue === null) {
    await routeToDlq(dlq, "", "validation", "empty Kafka message value");
    return;
  }

  let json: unknown;
  try {
    json = JSON.parse(rawValue);
  } catch (err) {
    await routeToDlq(dlq, rawValue, "validation", `invalid JSON: ${errText(err)}`);
    return;
  }

  // Validate against the wire contract. Anything that fails the schema is
  // a poison message — retrying would never help, so it goes straight to
  // the DLQ.
  const parsed = KafkaLogPayloadSchema.safeParse(json);
  if (!parsed.success) {
    await routeToDlq(dlq, rawValue, "validation", z.prettifyError(parsed.error));
    return;
  }
  const payload = parsed.data;

  // Transient write failures (broker of the DB momentarily down) are
  // worth retrying; a persistent failure falls through to the DLQ.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
    const stopTimer = writeDuration.startTimer();
    try {
      await writeInferenceLog(db, payload);
      stopTimer();
      logsWritten.inc();
      return;
    } catch (err) {
      stopTimer();
      lastErr = err;
      logger.warn(
        { attempt, eventId: payload.eventId, err: errText(err) },
        "inference_logs write failed",
      );
    }
  }

  await routeToDlq(
    dlq,
    rawValue,
    "write_failed",
    `write failed after ${MAX_WRITE_ATTEMPTS} attempts: ${errText(lastErr)}`,
  );
}

async function routeToDlq(
  dlq: DeadLetterQueue,
  rawValue: string,
  reason: DlqReason,
  detail: string,
): Promise<void> {
  messagesDlq.inc({ reason });
  logger.warn({ reason, detail }, "routing message to DLQ");
  try {
    await dlq.send(rawValue, reason, detail);
  } catch (err) {
    // The DLQ itself is unreachable. Log and drop — throwing here would
    // crash the consumer loop and stall ingestion entirely.
    logger.error({ err: errText(err) }, "DLQ send failed — message dropped");
  }
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
