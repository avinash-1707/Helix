// User-facing model catalogue. The backend speaks in provider ids
// ("anthropic" | "openai" | "google" | "openrouter"); the interface
// only ever shows these friendly names. No internal vocabulary leaks
// to the screen.
//
// Top-level providers: Claude, GPT, Gemini — direct SDK calls.
// "More models" — everything else, routed through OpenRouter under
// the `openrouter` provider with a specific model string. The
// "OpenRouter" name is never shown; users see the underlying model.

import type { Provider } from "@helix/types";

export type ModelInfo = {
  /** Wire value sent to the API. */
  provider: Provider;
  /** Name shown to the person. */
  name: string;
  /** One-line character sketch for the picker. */
  blurb: string;
  /** Maker, shown small. */
  maker: string;
  /** CSS custom property holding this model's identity hue. */
  hue: string;
};

export const MODELS: Record<Provider, ModelInfo> = {
  anthropic: {
    provider: "anthropic",
    name: "Claude",
    blurb: "Considered, articulate, good with nuance.",
    maker: "Anthropic",
    hue: "var(--color-claude)",
  },
  openai: {
    provider: "openai",
    name: "GPT",
    blurb: "Quick, versatile, broadly capable.",
    maker: "OpenAI",
    hue: "var(--color-gpt)",
  },
  google: {
    provider: "google",
    name: "Gemini",
    blurb: "Fast, wide-ranging, strong at reasoning.",
    maker: "Google",
    hue: "var(--color-gemini)",
  },
  // Generic openrouter entry. Used only as the fallback when an
  // openrouter-backed conversation references a model string that is
  // not in EXTRA_MODELS — never surfaced in the top-level picker.
  openrouter: {
    provider: "openrouter",
    name: "Assistant",
    blurb: "",
    maker: "",
    hue: "var(--color-openrouter)",
  },
};

// Native top-level providers shown as cards on the welcome screen.
export const MODEL_ORDER: Provider[] = ["anthropic", "openai", "google"];

// Curated set of additional models, all routed via OpenRouter. Each
// entry maps to a specific model string the SDK forwards verbatim.
// `key` is a stable id used as React keys and selection state.
export type ExtraModel = {
  key: string;
  /** Wire model string for OpenRouter. */
  model: string;
  /** Display name. */
  name: string;
  /** Maker, shown small. */
  maker: string;
  /** Short pitch line. */
  blurb: string;
  /** Hue used in dots/badges. */
  hue: string;
};

export const EXTRA_MODELS: ExtraModel[] = [
  {
    key: "deepseek-r1",
    model: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    maker: "DeepSeek",
    blurb: "Reasoning-tuned, strong at math and code.",
    hue: "var(--color-deepseek)",
  },
  {
    key: "deepseek-v3",
    model: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    maker: "DeepSeek",
    blurb: "Fast general chat, low cost.",
    hue: "var(--color-deepseek)",
  },
  {
    key: "grok-4",
    model: "x-ai/grok-4",
    name: "Grok 4",
    maker: "xAI",
    blurb: "Direct, witty, current-events aware.",
    hue: "var(--color-grok)",
  },
  {
    key: "llama-3.3-70b",
    model: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    maker: "Meta",
    blurb: "Open weights, broad knowledge.",
    hue: "var(--color-llama)",
  },
  {
    key: "mistral-large",
    model: "mistralai/mistral-large",
    name: "Mistral Large",
    maker: "Mistral",
    blurb: "European, multilingual, well-rounded.",
    hue: "var(--color-mistral)",
  },
  {
    key: "qwen-2.5-72b",
    model: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    maker: "Alibaba",
    blurb: "Strong at code, multilingual.",
    hue: "var(--color-qwen)",
  },
];

// A conversation has both a provider and a model string. For native
// providers we resolve to the top-level MODELS entry; for openrouter
// we look up the EXTRA_MODELS entry so the underlying model name is
// shown — never "OpenRouter".
export function modelInfo(provider: string, model?: string): ModelInfo {
  if (provider === "openrouter" && model) {
    const extra = EXTRA_MODELS.find((m) => m.model === model);
    if (extra) {
      return {
        provider: "openrouter",
        name: extra.name,
        blurb: extra.blurb,
        maker: extra.maker,
        hue: extra.hue,
      };
    }
  }
  return (
    MODELS[provider as Provider] ?? {
      provider: provider as Provider,
      name: "Assistant",
      blurb: "",
      maker: "",
      hue: "var(--color-ink-dim)",
    }
  );
}

// A user's chosen model in the new-conversation screen. For native
// providers `model` stays undefined and the backend default applies;
// for openrouter `model` is required and forwarded verbatim.
export type ModelSelection = {
  provider: Provider;
  model?: string;
};
