// @helix/ingestion — Kafka consumer + PostgreSQL writer.
// Build-order step 5 (parallel): consumes llm.inference.logs,
// runs Zod validation + PII redaction, writes inference_logs,
// moves invalid payloads to the llm.inference.dlq topic.

export {};
