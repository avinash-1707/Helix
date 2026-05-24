// Anthropic (Claude) provider. Wraps @anthropic-ai/sdk streaming.
// System messages are pulled into the dedicated `system` param;
// Anthropic only accepts user/assistant turns in `messages`.

import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ProviderRequest, ProviderStreamChunk } from "./types.js";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  readonly #client: Anthropic;

  constructor(apiKey: string) {
    this.#client = new Anthropic({ apiKey });
  }

  async *stream(req: ProviderRequest): AsyncIterable<ProviderStreamChunk> {
    const systemParts: string[] = [];
    const messages: Anthropic.MessageParam[] = [];
    for (const m of req.messages) {
      if (m.role === "system") {
        systemParts.push(m.content);
        continue;
      }
      messages.push({ role: m.role, content: m.content });
    }

    let promptTokens: number | null = null;
    let completionTokens: number | null = null;

    const stream = this.#client.messages.stream(
      {
        model: req.model,
        max_tokens: req.maxTokens,
        messages,
        ...(systemParts.length > 0 ? { system: systemParts.join("\n\n") } : {}),
      },
      req.signal ? { signal: req.signal } : undefined,
    );

    for await (const event of stream) {
      if (event.type === "message_start") {
        promptTokens = event.message.usage.input_tokens;
      } else if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { type: "text", text: event.delta.text };
      } else if (event.type === "message_delta") {
        completionTokens = event.usage.output_tokens;
      }
    }

    yield { type: "usage", promptTokens, completionTokens };
  }
}
