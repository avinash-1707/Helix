"use client";

// Model identity UI — a dot, an inline badge, and the selectable picker.
// Everything the person sees is a friendly name; provider ids stay internal.

import type { Provider } from "@helix/types";
import { MODELS, MODEL_ORDER, modelInfo } from "@/lib/models";

/** A small hue dot identifying a model. */
export function ModelDot({
  provider,
  size = 8,
}: {
  provider: string;
  size?: number;
}) {
  const { hue } = modelInfo(provider);
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: hue,
        boxShadow: `0 0 0 3px color-mix(in srgb, ${hue} 18%, transparent)`,
      }}
    />
  );
}

/** Inline "● Claude" badge used in headers and rows. */
export function ModelBadge({ provider }: { provider: string }) {
  const { name } = modelInfo(provider);
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim">
      <ModelDot provider={provider} />
      {name}
    </span>
  );
}

/** Three-card model chooser shown on the new-conversation screen. */
export function ModelPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: Provider;
  onChange: (next: Provider) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose who to talk with"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
    >
      {MODEL_ORDER.map((provider, i) => {
        const model = MODELS[provider];
        const selected = provider === value;
        return (
          <button
            key={provider}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(provider)}
            style={{ animationDelay: `${i * 70}ms` }}
            className={[
              "anim-rise group relative overflow-hidden rounded-md border p-3.5 text-left",
              "transition-all duration-200 ease-out",
              "disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-accent bg-surface-hi"
                : "border-border bg-surface hover:border-border-hi hover:bg-surface-hi",
            ].join(" ")}
          >
            {/* hue wash that intensifies on selection */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-10 h-20 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
              style={{
                background: model.hue,
                opacity: selected ? 0.5 : undefined,
              }}
            />
            <span className="relative flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ModelDot provider={provider} size={9} />
                <span className="font-display text-xl leading-none text-ink">
                  {model.name}
                </span>
              </span>
              <span
                className={[
                  "h-3.5 w-3.5 rounded-full border transition-colors",
                  selected
                    ? "border-accent bg-accent"
                    : "border-border-hi bg-transparent",
                ].join(" ")}
              />
            </span>
            <span className="relative mt-2 block text-[12.5px] leading-snug text-ink-dim">
              {model.blurb}
            </span>
          </button>
        );
      })}
    </div>
  );
}
