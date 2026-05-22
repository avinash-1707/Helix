// Prometheus metrics for the ingestion service. Scraped by Prometheus
// from the `/metrics` endpoint exposed by `server.ts`.

import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
collectDefaultMetrics({ register: registry });

// One increment per Kafka message pulled off `llm.inference.logs`.
export const messagesConsumed = new Counter({
  name: "helix_ingestion_messages_consumed_total",
  help: "Kafka messages consumed from the inference-logs topic",
  registers: [registry],
});

// One increment per row successfully written to `inference_logs`.
export const logsWritten = new Counter({
  name: "helix_ingestion_logs_written_total",
  help: "Inference-log rows written to PostgreSQL",
  registers: [registry],
});

// One increment per message routed to the dead-letter queue, labelled
// by reason: 'validation' (bad payload) or 'write_failed' (DB unreachable).
export const messagesDlq = new Counter({
  name: "helix_ingestion_dlq_total",
  help: "Messages routed to the dead-letter queue",
  labelNames: ["reason"] as const,
  registers: [registry],
});

// Wall-clock duration of a single `inference_logs` insert.
export const writeDuration = new Histogram({
  name: "helix_ingestion_write_duration_seconds",
  help: "Duration of an inference_logs insert",
  registers: [registry],
});
