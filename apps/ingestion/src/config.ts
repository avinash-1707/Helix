// Startup environment validation. All required keys are checked here
// with Zod — the process exits fast if anything is missing or malformed
// (code-standards.md: fail fast, never crash mid-run).

import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_TOPIC_LOGS: z.string().min(1).default("llm.inference.logs"),
  KAFKA_TOPIC_DLQ: z.string().min(1).default("llm.inference.dlq"),
  KAFKA_CONSUMER_GROUP: z.string().min(1).default("helix-ingestion"),
  INGESTION_PORT: z.coerce.number().int().positive().default(3002),
});

// Resolved, typed configuration handed to the rest of the service.
export type IngestionConfig = {
  databaseUrl: string;
  kafkaBrokers: string[];
  topicLogs: string;
  topicDlq: string;
  consumerGroup: string;
  port: number;
};

// Parses and validates `process.env`. On failure, prints the problem and
// exits with code 1 — there is no safe partial-config fallback.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): IngestionConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    console.error(
      "[helix-ingestion] invalid environment:\n" + z.prettifyError(parsed.error),
    );
    process.exit(1);
  }
  const e = parsed.data;
  return {
    databaseUrl: e.DATABASE_URL,
    kafkaBrokers: e.KAFKA_BROKERS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    topicLogs: e.KAFKA_TOPIC_LOGS,
    topicDlq: e.KAFKA_TOPIC_DLQ,
    consumerGroup: e.KAFKA_CONSUMER_GROUP,
    port: e.INGESTION_PORT,
  };
}
