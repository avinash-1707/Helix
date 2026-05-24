// @helix/sdk — unified LLMClient wrapper.
// Pure TypeScript — no HTTP layer. Imported by apps/api only.
//
// Exports the unified client, its config/request shapes, the provider
// contract, the Kafka emitter, and the shared PII redaction utility.

export { LLMClient, ABORT_CLIENT_CLOSED, ABORT_TIMEOUT } from "./llm-client.js";
export type { LLMClientConfig, LLMRequest } from "./llm-client.js";
export { KafkaEmitter } from "./kafka-emitter.js";
export type { KafkaEmitterConfig } from "./kafka-emitter.js";
export { redactPII } from "./redaction.js";
export type {
  ChatMessage,
  LLMProvider,
  ProviderRequest,
  ProviderStreamChunk,
} from "./providers/index.js";
