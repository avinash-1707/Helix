// Shared provider contract. Every LLM provider (Anthropic, OpenAI,
// Gemini) implements `LLMProvider` so `LLMClient` stays provider-
// agnostic — callers never branch on which provider is active.

import type { MessageRole, Provider } from "@helix/types";

// One conversation turn handed to a provider. `role` reuses the shared
// union from @helix/types; providers map it to their own role names.
export type ChatMessage = {
  role: MessageRole;
  content: string;
};

// A provider emits a sequence of `text` chunks followed by exactly one
// `usage` chunk carrying the final token counts. Token counts are
// nullable — not every provider reports them on every call.
export type ProviderStreamChunk =
  | { type: "text"; text: string }
  | {
      type: "usage";
      promptTokens: number | null;
      completionTokens: number | null;
    };

// Provider-level request. System messages are part of `messages`;
// each provider extracts them into its own system-prompt slot.
export type ProviderRequest = {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
};

// The contract LLMClient depends on. Implementations live one-per-file
// in this directory (code-standards.md).
export interface LLMProvider {
  readonly name: Provider;
  stream(req: ProviderRequest): AsyncIterable<ProviderStreamChunk>;
}
