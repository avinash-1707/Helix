// Dead-letter queue producer. Invalid payloads (failed Zod validation)
// and payloads that cannot be written after retries are routed to the
// `llm.inference.dlq` topic with diagnostic headers — never dropped
// silently and never blocking the main consumer loop.

import type { Producer } from "kafkajs";

export type DlqReason = "validation" | "write_failed";

export class DeadLetterQueue {
  readonly #producer: Producer;
  readonly #topic: string;

  constructor(producer: Producer, topic: string) {
    this.#producer = producer;
    this.#topic = topic;
  }

  // Re-publishes the original raw message bytes to the DLQ topic. The
  // failure reason and a truncated detail string travel as headers so a
  // human (or a replay tool) can triage without re-parsing the payload.
  async send(rawValue: string, reason: DlqReason, detail: string): Promise<void> {
    await this.#producer.send({
      topic: this.#topic,
      messages: [
        {
          value: rawValue,
          headers: {
            "x-dlq-reason": reason,
            "x-dlq-detail": detail.slice(0, 500),
            "x-dlq-at": new Date().toISOString(),
          },
        },
      ],
    });
  }
}
