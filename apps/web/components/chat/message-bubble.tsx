"use client";

// One message. Content is rendered as plain text (with fenced code blocks
// detected) — never as HTML, so nothing in a reply can inject markup.

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { MessageRole } from "@helix/types";
import { clockTime } from "@/lib/format";
import { ModelDot } from "../model";
import { modelInfo } from "@/lib/models";

type Segment =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string };

// Splits on triple-backtick fences. An unclosed fence (mid-stream) simply
// stays text until its closing fence arrives.
function toSegments(text: string): Segment[] {
  const out: Segment[] = [];
  const fence = /```[\w-]*\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(text)) !== null) {
    if (m.index > last) {
      out.push({ kind: "text", value: text.slice(last, m.index) });
    }
    out.push({ kind: "code", value: (m[1] ?? "").replace(/\n$/, "") });
    last = fence.lastIndex;
  }
  if (last < text.length) out.push({ kind: "text", value: text.slice(last) });
  return out;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy message"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked — nothing to do */
        }
      }}
      className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-hi hover:text-ink"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-positive" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function Body({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  const segments = toSegments(content);
  return (
    <div className="space-y-3">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        if (seg.kind === "code") {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-md border border-border bg-bg px-3.5 py-3 font-mono text-[13px] leading-relaxed text-ink"
            >
              <code>{seg.value}</code>
            </pre>
          );
        }
        return (
          <p
            key={i}
            className={[
              "whitespace-pre-wrap break-words text-[15px] leading-[1.7]",
              streaming && isLast ? "caret" : "",
            ].join(" ")}
          >
            {seg.value}
          </p>
        );
      })}
    </div>
  );
}

export function MessageBubble({
  role,
  content,
  provider,
  time,
  streaming = false,
}: {
  role: MessageRole;
  content: string;
  provider?: string;
  time?: string;
  streaming?: boolean;
}) {
  if (role === "system") {
    return (
      <div className="mx-auto max-w-md py-1 text-center text-[12px] text-ink-faint">
        {content}
      </div>
    );
  }

  if (role === "user") {
    return (
      <div className="anim-rise group flex flex-col items-end">
        <div className="max-w-[88%] rounded-lg rounded-br-sm border border-border-hi bg-surface-hi px-3.5 py-2.5 sm:max-w-[75%]">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-ink">
            {content}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-1.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100">
          {time && (
            <span className="font-mono text-[10.5px] text-ink-faint">
              {clockTime(time)}
            </span>
          )}
          <CopyButton text={content} />
        </div>
      </div>
    );
  }

  // assistant
  const name = provider ? modelInfo(provider).name : "Assistant";
  return (
    <div className="anim-rise group flex flex-col items-start">
      <div className="mb-1.5 flex items-center gap-2">
        {provider && <ModelDot provider={provider} />}
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-dim">
          {name}
        </span>
      </div>
      <div className="max-w-full text-ink">
        <Body content={content} streaming={streaming} />
      </div>
      {!streaming && content.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          {time && (
            <span className="font-mono text-[10.5px] text-ink-faint">
              {clockTime(time)}
            </span>
          )}
          <CopyButton text={content} />
        </div>
      )}
    </div>
  );
}
