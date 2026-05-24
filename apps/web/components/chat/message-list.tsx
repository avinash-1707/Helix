"use client";

// The scrollable transcript. Keeps itself pinned to the newest message
// while the reader is at the bottom, and offers a jump button otherwise.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import type { MessageRole } from "@helix/types";
import { MessageBubble } from "./message-bubble";

export type DisplayMessage = {
  id: string;
  role: MessageRole;
  content: string;
  time?: string;
  streaming?: boolean;
};

export function MessageList({
  messages,
  provider,
  model,
  thinking = false,
}: {
  messages: DisplayMessage[];
  provider: string;
  model?: string;
  thinking?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);

  // Distance from the bottom under which we consider the view "pinned".
  const THRESHOLD = 120;

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(gap < THRESHOLD);
  }

  function jumpToEnd(smooth = true) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  // Follow new content while pinned. useLayoutEffect avoids a visible jump.
  const lastContent = messages[messages.length - 1]?.content ?? "";
  useLayoutEffect(() => {
    if (pinned) jumpToEnd(false);
  }, [messages.length, lastContent, thinking, pinned]);

  // Land at the bottom on first mount.
  useEffect(() => {
    jumpToEnd(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto scroll-smooth"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-7 px-4 py-8 sm:px-8">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              provider={m.role === "assistant" ? provider : undefined}
              model={m.role === "assistant" ? model : undefined}
              time={m.time}
              streaming={m.streaming}
            />
          ))}

          {thinking && (
            <div className="anim-fade flex flex-col items-start">
              <div className="dots flex h-5 items-center" aria-label="Thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* jump-to-latest — only when the reader has scrolled away */}
      <button
        type="button"
        onClick={() => jumpToEnd(true)}
        aria-hidden={pinned}
        tabIndex={pinned ? -1 : 0}
        className={[
          "absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center",
          "rounded-full border border-border-hi bg-surface text-ink-dim shadow-lg",
          "transition-all duration-200 hover:text-ink",
          pinned
            ? "pointer-events-none translate-y-3 opacity-0"
            : "opacity-100",
        ].join(" ")}
      >
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}
