// PostgreSQL write path for inference logs.
//
// PII redaction runs here a SECOND time (ai-workflow-rules.md: two layers,
// SDK emit + ingestion write). Even if the SDK redaction were bypassed or
// a payload arrived from an older SDK, raw PII still never reaches the DB
// (architecture.md invariant 2).

import { inferenceLogs, type Db } from "@helix/db";
import { redactPII } from "@helix/sdk/redaction";
import type { KafkaLogPayload } from "@helix/types";

// Inserts one validated payload into the `inference_logs` hypertable.
// Wire timestamps are ISO strings — converted to Date for the TIMESTAMPTZ
// columns here. Throws on failure so the caller can retry / route to DLQ.
export async function writeInferenceLog(
  db: Db,
  payload: KafkaLogPayload,
): Promise<void> {
  await db.insert(inferenceLogs).values({
    conversationId: payload.conversationId,
    messageId: payload.messageId,
    provider: payload.provider,
    model: payload.model,
    promptTokens: payload.promptTokens,
    completionTokens: payload.completionTokens,
    latencyMs: payload.latencyMs,
    firstTokenMs: payload.firstTokenMs,
    status: payload.status,
    errorCode: payload.errorCode,
    inputPreview:
      payload.inputPreview === null ? null : redactPII(payload.inputPreview),
    outputPreview:
      payload.outputPreview === null ? null : redactPII(payload.outputPreview),
    requestAt: new Date(payload.requestAt),
    responseAt:
      payload.responseAt === null ? null : new Date(payload.responseAt),
  });
}
