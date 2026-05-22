// @helix/ingestion — Kafka consumer + PostgreSQL writer.
//
// Consumes `llm.inference.logs`, validates each payload against the wire
// contract, redacts PII, and writes to the `inference_logs` hypertable.
// Invalid or undeliverable payloads are routed to `llm.inference.dlq`.
// A small HTTP server exposes Prometheus metrics. See architecture.md.

import "dotenv/config";
import { Kafka } from "kafkajs";
import { createDb } from "@helix/db";
import { loadConfig } from "./config.js";
import { DeadLetterQueue } from "./dlq.js";
import { logger } from "./logger.js";
import { messagesConsumed } from "./metrics.js";
import { processMessage } from "./processor.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDb(config.databaseUrl);

  const kafka = new Kafka({
    clientId: "helix-ingestion",
    brokers: config.kafkaBrokers,
  });
  const consumer = kafka.consumer({ groupId: config.consumerGroup });
  const producer = kafka.producer();
  const dlq = new DeadLetterQueue(producer, config.topicDlq);

  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: config.topicLogs, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      messagesConsumed.inc();
      const raw = message.value ? message.value.toString("utf8") : null;
      // processMessage never throws — it always resolves to a write or a
      // DLQ route, so the consumer offset advances on every message.
      await processMessage(db, dlq, raw);
    },
  });

  const server = buildServer();
  await server.listen({ host: "0.0.0.0", port: config.port });
  logger.info(
    { port: config.port, topic: config.topicLogs, dlq: config.topicDlq },
    "ingestion service started",
  );

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    try {
      await consumer.disconnect();
      await producer.disconnect();
      await server.close();
    } catch (err) {
      logger.error({ err }, "error during shutdown");
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  logger.error({ err }, "fatal: ingestion failed to start");
  process.exit(1);
});
