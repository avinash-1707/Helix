import { z } from "zod";
import { InferenceLogSchema } from "./inference-log.js";

// Metadata captured by the SDK for a single LLM call, in memory, before
// it is emitted to Kafka. Identical to an InferenceLog minus the DB-assigned
// `id` — the ingestion service assigns the id on write.
export const LLMCallMetadataSchema = InferenceLogSchema.omit({ id: true });
export type LLMCallMetadata = z.infer<typeof LLMCallMetadataSchema>;
