// OpenAI (GPT) provider. Wraps the `openai` SDK chat-completions
// streaming API. `stream_options.include_usage` makes OpenAI append a
// final chunk carrying token counts (omitted by default when streaming).

import OpenAI from "openai";
import type { LLMProvider, ProviderRequest, ProviderStreamChunk } from "./types.js";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  readonly #client: OpenAI;

  constructor(apiKey: string) {
    this.#client = new OpenAI({ apiKey });
  }

  async *stream(req: ProviderRequest): AsyncIterable<ProviderStreamChunk> {
    let promptTokens: number | null = null;
    let completionTokens: number | null = null;

    const stream = await this.#client.chat.completions.create({
      model: req.model,
      messages: req.messages.map(toOpenAIMessage),
      max_tokens: req.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { type: "text", text: delta };
      }
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens;
        completionTokens = chunk.usage.completion_tokens;
      }
    }

    yield { type: "usage", promptTokens, completionTokens };
  }
}

// Maps a shared ChatMessage to an OpenAI message param. The switch is
// exhaustive over MessageRole so each branch returns a concrete,
// correctly-typed param — no cast, no `any`.
function toOpenAIMessage(
  m: ProviderRequest["messages"][number],
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  switch (m.role) {
    case "system":
      return { role: "system", content: m.content };
    case "user":
      return { role: "user", content: m.content };
    case "assistant":
      return { role: "assistant", content: m.content };
  }
}
