"use client";

// The new-conversation screen. Choose a model, then write the first
// message — the conversation is created the moment it's sent.

import { Menu } from "lucide-react";
import type { Provider } from "@helix/types";
import { MODELS } from "@/lib/models";
import { ModelPicker } from "../model";
import { Composer } from "./composer";

const STARTERS = [
  "Explain a hard idea in plain language",
  "Help me draft a difficult message",
  "Plan my week around three priorities",
];

export function Welcome({
  model,
  onModelChange,
  onStart,
  starting,
  onOpenRail,
}: {
  model: Provider;
  onModelChange: (next: Provider) => void;
  onStart: (text: string) => Promise<boolean>;
  starting: boolean;
  onOpenRail: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* mobile-only bar to reach the rail */}
      <div className="flex h-14 shrink-0 items-center px-3 lg:hidden">
        <button
          type="button"
          onClick={onOpenRail}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-surface hover:text-ink"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 py-8">
        <div className="w-full max-w-2xl">
          <p className="anim-rise font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
            Helix
          </p>
          <h1
            className="anim-rise mt-3 font-display text-[clamp(2.4rem,6vw,3.6rem)] leading-[1.05] tracking-tight text-ink"
            style={{ animationDelay: "60ms" }}
          >
            A quiet place to
            <br />
            <span className="italic text-accent">think out loud.</span>
          </h1>
          <p
            className="anim-rise mt-4 max-w-md text-[15px] leading-relaxed text-ink-dim"
            style={{ animationDelay: "120ms" }}
          >
            Choose who you&apos;d like to talk with, then say what&apos;s on
            your mind. Everything you send is saved so you can pick it back up
            later.
          </p>

          <div
            className="anim-rise mt-8"
            style={{ animationDelay: "180ms" }}
          >
            <ModelPicker
              value={model}
              onChange={onModelChange}
              disabled={starting}
            />
          </div>

          <div
            className="anim-rise mt-5"
            style={{ animationDelay: "260ms" }}
          >
            <Composer
              onSend={onStart}
              busy={starting}
              autoFocus
              placeholder={`Message ${MODELS[model].name}…`}
            />
          </div>

          <div
            className="anim-rise mt-4 flex flex-wrap gap-2"
            style={{ animationDelay: "320ms" }}
          >
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={starting}
                onClick={() => void onStart(s)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] text-ink-dim transition-all duration-150 hover:border-border-hi hover:text-ink active:scale-[0.97] disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
