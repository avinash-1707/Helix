import { z } from "zod";
import { InferenceStatusSchema, ProviderSchema } from "./enums.js";

// Wire contract for the `llm.inference.logs` Kafka topic.
//
// One message per LLM call (architecture.md invariant 5). This is the
// JSON-serialized form: timestamps are ISO-8601 strings, not Date objects.
// The SDK builds and emits this; the ingestion service validates it with
// this schema before redaction and the inference_logs write. Payloads that
// fail validation are routed to the `llm.inference.dlq` topic.
//
// `schemaVersion` is bumped on any breaking change to this shape so old
// and new consumers can coexist during a rollout.
export const KAFKA_LOG_SCHEMA_VERSION = 1 as const;

export const KafkaLogPayloadSchema = z.object({
  schemaVersion: z.literal(KAFKA_LOG_SCHEMA_VERSION),
  eventId: z.uuid(),
  emittedAt: z.iso.datetime(),
  conversationId: z.uuid().nullable(),
  messageId: z.uuid().nullable(),
  provider: ProviderSchema,
  model: z.string().min(1),
  promptTokens: z.number().int().nonnegative().nullable(),
  completionTokens: z.number().int().nonnegative().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  firstTokenMs: z.number().int().nonnegative().nullable(),
  status: InferenceStatusSchema,
  errorCode: z.string().nullable(),
  inputPreview: z.string().nullable(),
  outputPreview: z.string().nullable(),
  requestAt: z.iso.datetime(),
  responseAt: z.iso.datetime().nullable(),
});
export type KafkaLogPayload = z.infer<typeof KafkaLogPayloadSchema>;
