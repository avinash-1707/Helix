// Fire-and-forget Kafka emitter for inference-log events.
//
// architecture.md invariant 1: the log write path NEVER blocks the user
// response. `emit()` returns void synchronously; the send runs detached
// with a bounded timeout. Any failure (broker down, timeout, serialize
// error) is caught and logged to stderr — never thrown to the caller.

import { Kafka, type Producer } from "kafkajs";
import { KafkaLogPayloadSchema, type KafkaLogPayload } from "@helix/types";

export type KafkaEmitterConfig = {
  brokers: string[];
  topic: string;
  clientId?: string;
  // Upper bound on a single send before it is abandoned. Default 2000ms
  // (code-standards.md). The send is not cancelled — we just stop waiting.
  emitTimeoutMs?: number;
};

const DEFAULT_EMIT_TIMEOUT_MS = 2000;

export class KafkaEmitter {
  readonly #producer: Producer;
  readonly #topic: string;
  readonly #timeoutMs: number;
  #connected = false;
  #connecting: Promise<void> | undefined;

  constructor(config: KafkaEmitterConfig) {
    // Constructing the client opens no socket — connection is lazy.
    const kafka = new Kafka({
      clientId: config.clientId ?? "helix-sdk",
      brokers: config.brokers,
    });
    this.#producer = kafka.producer();
    this.#topic = config.topic;
    this.#timeoutMs = config.emitTimeoutMs ?? DEFAULT_EMIT_TIMEOUT_MS;
  }

  // Fire-and-forget. Returns immediately; the caller never awaits this.
  emit(payload: KafkaLogPayload): void {
    void this.#send(payload).catch((err: unknown) => {
      console.error("[helix-sdk] kafka emit failed:", err);
    });
  }

  async #send(payload: KafkaLogPayload): Promise<void> {
    // Validate before emitting so a malformed payload fails here (logged)
    // rather than silently poisoning the ingestion DLQ.
    const value = JSON.stringify(KafkaLogPayloadSchema.parse(payload));
    const work = (async () => {
      await this.#ensureConnected();
      await this.#producer.send({
        topic: this.#topic,
        messages: [{ key: payload.eventId, value }],
      });
    })();
    await withTimeout(work, this.#timeoutMs);
  }

  async #ensureConnected(): Promise<void> {
    if (this.#connected) return;
    if (!this.#connecting) {
      this.#connecting = this.#producer
        .connect()
        .then(() => {
          this.#connected = true;
        })
        .finally(() => {
          this.#connecting = undefined;
        });
    }
    await this.#connecting;
  }

  // Graceful shutdown for long-lived hosts (apps/api).
  async close(): Promise<void> {
    if (this.#connected) {
      await this.#producer.disconnect();
      this.#connected = false;
    }
  }
}

// Rejects if `work` does not settle within `ms`. The timer is unref'd so
// it never keeps the process alive, and cleared once `work` settles.
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`kafka emit timed out after ${ms}ms`));
    }, ms);
    timer.unref();
    work.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}
