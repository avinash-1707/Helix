"use client";

// Model identity UI — a dot, an inline badge, and the selectable picker.
// Everything the person sees is a friendly name; provider ids stay
// internal. "OpenRouter" is never shown — its sub-models surface as
// "DeepSeek R1", "Grok 4", etc. under a "More models" dropdown.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  EXTRA_MODELS,
  MODELS,
  MODEL_ORDER,
  modelInfo,
  type ExtraModel,
  type ModelSelection,
} from "@/lib/models";

/** A small hue dot identifying a model. */
export function ModelDot({
  provider,
  model,
  size = 8,
}: {
  provider: string;
  model?: string;
  size?: number;
}) {
  const { hue } = modelInfo(provider, model);
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
export function ModelBadge({
  provider,
  model,
}: {
  provider: string;
  model?: string;
}) {
  const { name } = modelInfo(provider, model);
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim">
      <ModelDot provider={provider} model={model} />
      {name}
    </span>
  );
}

/** Model chooser: three native cards plus a "More models" dropdown. */
export function ModelPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ModelSelection;
  onChange: (next: ModelSelection) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <div
        role="radiogroup"
        aria-label="Choose who to talk with"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      >
        {MODEL_ORDER.map((provider, i) => {
          const model = MODELS[provider];
          const selected =
            value.provider === provider && value.model === undefined;
          return (
            <button
              key={provider}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange({ provider })}
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

      <MoreModelsMenu
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

// Dropdown listing OpenRouter-backed models. Selecting one sets
// {provider:"openrouter", model:<id>} on the parent. Click-outside
// and Escape close it.
function MoreModelsMenu({
  value,
  onChange,
  disabled,
}: {
  value: ModelSelection;
  onChange: (next: ModelSelection) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeExtra: ExtraModel | undefined =
    value.provider === "openrouter"
      ? EXTRA_MODELS.find((m) => m.model === value.model)
      : undefined;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (m: ExtraModel) => {
    onChange({ provider: "openrouter", model: m.model });
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex w-full items-center justify-between rounded-md border p-3 text-left",
          "transition-all duration-200 ease-out",
          "disabled:cursor-not-allowed disabled:opacity-50",
          activeExtra
            ? "border-accent bg-surface-hi"
            : "border-border bg-surface hover:border-border-hi hover:bg-surface-hi",
        ].join(" ")}
      >
        <span className="flex items-center gap-2.5">
          {activeExtra ? (
            <>
              <ModelDot provider="openrouter" model={activeExtra.model} size={9} />
              <span className="flex flex-col">
                <span className="font-display text-[15px] leading-tight text-ink">
                  {activeExtra.name}
                </span>
                <span className="text-[11.5px] leading-tight text-ink-dim">
                  {activeExtra.maker}
                </span>
              </span>
            </>
          ) : (
            <>
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full bg-ink-dim"
              />
              <span className="text-[13.5px] text-ink-dim">
                More models — DeepSeek, Grok, Llama, Mistral, Qwen…
              </span>
            </>
          )}
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 text-ink-dim transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="More models"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-bg-elev p-1 shadow-2xl"
        >
          {EXTRA_MODELS.map((m) => {
            const selected = m.model === value.model;
            return (
              <li key={m.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => select(m)}
                  className={[
                    "flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left",
                    "transition-colors duration-150",
                    selected ? "bg-surface-hi" : "hover:bg-surface",
                  ].join(" ")}
                >
                  <ModelDot provider="openrouter" model={m.model} size={9} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 text-[13.5px] text-ink">
                      <span className="truncate">{m.name}</span>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-dim">
                        {m.maker}
                      </span>
                    </span>
                    <span className="truncate text-[12px] text-ink-dim">
                      {m.blurb}
                    </span>
                  </span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-accent" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
