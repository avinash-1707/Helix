// Unified LLM client. One interface for all providers — callers pass a
// provider name and never branch on which SDK is underneath.
//
// Streaming contract: `stream()` yields response text chunks unchanged
// and unbuffered (stream interception must not mutate or delay the
// stream — code-standards.md). After the stream closes, errors, or is
// cancelled, exactly ONE Kafka log event is emitted fire-and-forget
// (architecture.md invariants 1 and 5).

import {
  KAFKA_LOG_SCHEMA_VERSION,
  type InferenceStatus,
  type KafkaLogPayload,
  type Provider,
} from "@helix/types";
import { KafkaEmitter, type KafkaEmitterConfig } from "./kafka-emitter.js";
import { redactPII } from "./redaction.js";
import {
  AnthropicProvider,
  GeminiProvider,
  OpenAIProvider,
  type ChatMessage,
  type LLMProvider,
} from "./providers/index.js";

const DEFAULT_MAX_TOKENS = 4096;
const PREVIEW_CHARS = 200;

// Per-provider credentials. Only configured providers can be called;
// requesting an unconfigured provider throws before any network call.
export type LLMClientConfig = {
  providers: Partial<Record<Provider, { apiKey: string }>>;
  kafka: KafkaEmitterConfig;
  // Default cap on completion tokens when a request omits `maxTokens`.
  defaultMaxTokens?: number;
};

// One LLM call. `messages` is the full context window the caller has
// already assembled (system + prior turns + the new user turn).
export type LLMRequest = {
  provider: Provider;
  model: string;
  messages: ChatMessage[];
  conversationId: string | null;
  messageId: string | null;
  maxTokens?: number;
};

export class LLMClient {
  readonly #config: LLMClientConfig;
  readonly #emitter: KafkaEmitter;
  readonly #providers = new Map<Provider, LLMProvider>();

  constructor(config: LLMClientConfig) {
    this.#config = config;
    this.#emitter = new KafkaEmitter(config.kafka);
  }

  // Streams the assistant response as text chunks. The returned async
  // iterable forwards provider tokens verbatim. If the caller stops
  // iterating early (cancel), the log event is emitted with
  // status 'cancelled'; on provider error, status 'error' then rethrow.
  async *stream(req: LLMRequest): AsyncIterable<string> {
    const provider = this.#providerFor(req.provider);
    const maxTokens =
      req.maxTokens ?? this.#config.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;

    const requestAt = new Date();
    const startedAt = performance.now();
    let firstTokenMs: number | null = null;
    let promptTokens: number | null = null;
    let completionTokens: number | null = null;
    let output = "";
    // Default to 'cancelled': only a clean end or a thrown error
    // overrides it, so a caller that breaks early is recorded correctly.
    let status: InferenceStatus = "cancelled";
    let errorCode: string | null = null;

    try {
      for await (const chunk of provider.stream({
        model: req.model,
        messages: req.messages,
        maxTokens,
      })) {
        if (chunk.type === "text") {
          if (firstTokenMs === null) {
            firstTokenMs = Math.round(performance.now() - startedAt);
          }
          output += chunk.text;
          yield chunk.text;
        } else {
          promptTokens = chunk.promptTokens;
          completionTokens = chunk.completionTokens;
        }
      }
      status = "success";
    } catch (err: unknown) {
      status = "error";
      errorCode = toErrorCode(err);
      this.#emit(req, {
        requestAt,
        startedAt,
        firstTokenMs,
        promptTokens,
        completionTokens,
        output,
        status,
        errorCode,
      });
      throw err;
    } finally {
      // Reached on clean end AND on early-cancel; skipped only when the
      // catch block already emitted. Guarantees one event per call.
      if (status !== "error") {
        this.#emit(req, {
          requestAt,
          startedAt,
          firstTokenMs,
          promptTokens,
          completionTokens,
          output,
          status,
          errorCode,
        });
      }
    }
  }

  // Disconnects the Kafka producer. Call on host shutdown.
  async close(): Promise<void> {
    await this.#emitter.close();
  }

  #providerFor(name: Provider): LLMProvider {
    const cached = this.#providers.get(name);
    if (cached) return cached;

    const credentials = this.#config.providers[name];
    if (!credentials) {
      throw new Error(`LLM provider not configured: ${name}`);
    }

    const provider: LLMProvider =
      name === "anthropic"
        ? new AnthropicProvider(credentials.apiKey)
        : name === "openai"
          ? new OpenAIProvider(credentials.apiKey)
          : new GeminiProvider(credentials.apiKey);
    this.#providers.set(name, provider);
    return provider;
  }

  #emit(req: LLMRequest, capture: CallCapture): void {
    const responseAt = new Date(
      capture.requestAt.getTime() +
        Math.round(performance.now() - capture.startedAt),
    );
    const inputPreview = redactPII(lastUserMessage(req.messages)).slice(
      0,
      PREVIEW_CHARS,
    );
    const outputPreview = redactPII(capture.output).slice(0, PREVIEW_CHARS);

    const payload: KafkaLogPayload = {
      schemaVersion: KAFKA_LOG_SCHEMA_VERSION,
      eventId: crypto.randomUUID(),
      emittedAt: new Date().toISOString(),
      conversationId: req.conversationId,
      messageId: req.messageId,
      provider: req.provider,
      model: req.model,
      promptTokens: capture.promptTokens,
      completionTokens: capture.completionTokens,
      latencyMs: responseAt.getTime() - capture.requestAt.getTime(),
      firstTokenMs: capture.firstTokenMs,
      status: capture.status,
      errorCode: capture.errorCode,
      inputPreview,
      outputPreview,
      requestAt: capture.requestAt.toISOString(),
      responseAt: responseAt.toISOString(),
    };
    this.#emitter.emit(payload);
  }
}

// In-memory state captured during a single streamed call.
type CallCapture = {
  requestAt: Date;
  startedAt: number;
  firstTokenMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  output: string;
  status: InferenceStatus;
  errorCode: string | null;
};

// The newest user turn — what `input_preview` summarizes.
function lastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === "user") return m.content;
  }
  return "";
}

// Best-effort error code: provider SDKs surface an HTTP `status`; fall
// back to the error name. Never throws.
function toErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return String(status);
    if (typeof status === "string" && status.length > 0) return status;
  }
  if (err instanceof Error && err.name) return err.name;
  return "unknown";
}
