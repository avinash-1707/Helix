"use client";

// One message. Assistant replies render Markdown (GFM) via react-markdown
// — safe by default (no rawHtml), so reply content cannot inject markup.
// User messages stay plain text.

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageRole } from "@helix/types";
import { clockTime } from "@/lib/format";
import { ModelDot } from "../model";
import { modelInfo } from "@/lib/models";

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

function CodeBlock({ children }: { children: ReactNode }) {
  // Extract raw text for the copy affordance.
  const raw =
    typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.join("")
        : String(children ?? "");
  return (
    <div className="group/code relative my-3">
      <pre className="overflow-x-auto rounded-md border border-border bg-bg px-3.5 py-3 font-mono text-[13px] leading-relaxed text-ink">
        <code>{children}</code>
      </pre>
      <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover/code:opacity-100">
        <CopyButton text={raw} />
      </div>
    </div>
  );
}

// Markdown → Tailwind-styled elements. Anchor opens external links safely.
const mdComponents: Components = {
  p: ({ children }) => (
    <p className="text-[15px] leading-[1.7] [&:not(:last-child)]:mb-3">
      {children}
    </p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-ink-dim line-through">{children}</del>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-5 text-[15px] leading-[1.7] marker:text-ink-faint">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-5 text-[15px] leading-[1.7] marker:text-ink-faint">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-accent/50 pl-3.5 italic text-ink-dim">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="mb-2 mt-4 font-display text-[22px] font-medium leading-tight tracking-tight text-ink">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 font-display text-[19px] font-medium leading-tight tracking-tight text-ink">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 font-display text-[16.5px] font-medium leading-tight text-ink">
      {children}
    </h3>
  ),
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface text-left text-ink">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-3 py-2 font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/60 px-3 py-2 text-ink-dim last:border-b-0">
      {children}
    </td>
  ),
  code: ({ className, children, ...rest }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return <CodeBlock>{children}</CodeBlock>;
    }
    return (
      <code
        className="rounded bg-surface px-1.5 py-[1px] font-mono text-[13px] text-accent-hi"
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

function Body({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  return (
    <div className={streaming ? "md-body streaming" : "md-body"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
      {streaming && (
        <span
          aria-hidden
          className="caret ml-0.5 inline-block align-[-0.16em]"
        />
      )}
    </div>
  );
}

export function MessageBubble({
  role,
  content,
  provider,
  model,
  time,
  streaming = false,
}: {
  role: MessageRole;
  content: string;
  provider?: string;
  model?: string;
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
  const name = provider ? modelInfo(provider, model).name : "Assistant";
  return (
    <div className="anim-rise group flex flex-col items-start">
      <div className="mb-1.5 flex items-center gap-2">
        {provider && <ModelDot provider={provider} model={model} />}
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
