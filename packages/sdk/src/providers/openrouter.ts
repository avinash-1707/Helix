// OpenRouter provider. Routes a single API key to 300+ models across
// providers (Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, xAI,
// Qwen, ...). Wire-compatible with the OpenAI chat-completions API, so
// we reuse the `openai` SDK with a swapped `baseURL`. Model names are
// namespaced — e.g. `anthropic/claude-opus-4`, `meta-llama/llama-3.3-70b`,
// `google/gemini-2.5-pro`, `deepseek/deepseek-r1`.
//
// `stream_options.include_usage` produces a final chunk with token
// counts; OpenRouter normalizes these across upstream providers.

import OpenAI from "openai";
import type { LLMProvider, ProviderRequest, ProviderStreamChunk } from "./types.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export type OpenRouterProviderOptions = {
  // Optional ranking headers shown on openrouter.ai/rankings. Safe to omit.
  referer?: string;
  title?: string;
};

export class OpenRouterProvider implements LLMProvider {
  readonly name = "openrouter" as const;
  readonly #client: OpenAI;

  constructor(apiKey: string, opts: OpenRouterProviderOptions = {}) {
    const defaultHeaders: Record<string, string> = {};
    if (opts.referer) defaultHeaders["HTTP-Referer"] = opts.referer;
    if (opts.title) defaultHeaders["X-Title"] = opts.title;

    this.#client = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders,
    });
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

// Mirrors openai.ts: exhaustive switch over MessageRole, no casts.
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
