// User-facing model catalogue. The backend speaks in provider ids
// ("anthropic" | "openai" | "google"); the interface only ever shows
// these friendly names. No internal vocabulary leaks to the screen.

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
};

export const MODEL_ORDER: Provider[] = ["anthropic", "openai", "google"];

// A conversation stores a raw provider id; fall back gracefully if the
// backend ever returns one this build does not know about.
export function modelInfo(provider: string): ModelInfo {
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
