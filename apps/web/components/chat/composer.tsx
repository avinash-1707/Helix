"use client";

// The message input. Used both on the new-conversation screen and inside
// a live conversation. Owns its own draft text; auto-grows; sends on Enter.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Square } from "lucide-react";

const MAX_CHARS = 8000;
const COUNTER_AT = 6800;

export function Composer({
  onSend,
  onStop,
  streaming = false,
  busy = false,
  disabled = false,
  placeholder = "Write a message…",
  autoFocus = false,
}: {
  /** Returns true when the message was accepted; false restores the draft. */
  onSend: (text: string) => Promise<boolean>;
  onStop?: () => void;
  streaming?: boolean;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow the textarea to fit its content, up to a ceiling.
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 208)}px`;
  }, []);

  useLayoutEffect(resize, [text, resize]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const trimmed = text.trim();
  const over = text.length > MAX_CHARS;
  const canSend = trimmed.length > 0 && !over && !busy && !disabled;

  const submit = useCallback(async () => {
    if (!canSend) return;
    const outgoing = text;
    setText(""); // optimistic clear
    const accepted = await onSend(outgoing.trim());
    if (!accepted) {
      // Send was refused — give the person their words back.
      setText((current) => (current.length === 0 ? outgoing : current));
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [canSend, text, onSend]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const remaining = MAX_CHARS - text.length;
  const showCounter = text.length >= COUNTER_AT;

  return (
    <div className="w-full">
      <div
        className={[
          "group flex items-end gap-2 rounded-lg border bg-surface px-3 py-2.5",
          "transition-all duration-200",
          disabled
            ? "border-border opacity-60"
            : "border-border-hi focus-within:border-accent focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_14%,transparent)]",
        ].join(" ")}
      >
        <textarea
          ref={ref}
          value={text}
          rows={1}
          disabled={disabled}
          placeholder={disabled ? "This conversation is archived" : placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message"
          spellCheck
          className={[
            "max-h-52 flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed",
            "text-ink placeholder:text-ink-faint focus:outline-none",
            "disabled:cursor-not-allowed",
          ].join(" ")}
        />

        {streaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop the reply"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-hi bg-surface-hi text-ink-dim transition-all duration-150 hover:border-danger hover:text-danger active:scale-90"
          >
            <Square className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSend}
            aria-label="Send message"
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              "transition-all duration-150 active:scale-90",
              canSend
                ? "bg-accent text-[#1a1206] hover:bg-accent-hi"
                : "cursor-not-allowed bg-surface-hi text-ink-faint",
            ].join(" ")}
          >
            <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="mt-1.5 flex h-4 items-center justify-between px-1 text-[11px] text-ink-faint">
        <span>
          <kbd className="font-mono">Enter</kbd> to send ·{" "}
          <kbd className="font-mono">Shift+Enter</kbd> for a new line
        </span>
        {showCounter && (
          <span
            className={over ? "font-mono text-danger" : "font-mono text-ink-dim"}
          >
            {over ? `${-remaining} over` : `${remaining} left`}
          </span>
        )}
      </div>
    </div>
  );
}
