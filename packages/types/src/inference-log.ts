import { z } from "zod";
import { InferenceStatusSchema, ProviderSchema } from "./enums.js";

// One persisted LLM API call. Mirrors the `inference_logs` TimescaleDB
// hypertable. Previews are PII-redacted before they reach this shape.
export const InferenceLogSchema = z.object({
  id: z.uuid(),
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
  requestAt: z.date(),
  responseAt: z.date().nullable(),
});
export type InferenceLog = z.infer<typeof InferenceLogSchema>;
