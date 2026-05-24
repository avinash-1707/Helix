// Default model per provider. Used when a conversation is created without
// an explicit model. Mirrors the provider selector options in ui-context.md
// (Anthropic — Claude Sonnet, OpenAI — GPT-4.1, Google — Gemini,
// OpenRouter — routed via "anthropic/claude-sonnet-4.5" by default).

import type { Provider } from "@helix/types";

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4.1",
  google: "gemini-2.5-flash",
  openrouter: "anthropic/claude-sonnet-4.5",
};
