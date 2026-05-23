"use client";

// The conversation rail: brand, a button to start fresh, and the list of
// every past conversation.

import { Plus, X } from "lucide-react";
import type { ConversationView } from "@/lib/types";
import { Brand } from "./brand";
import { ConversationRow } from "./conversation-row";

function RowSkeleton() {
  return (
    <div className="rounded-md px-3 py-2.5">
      <div className="shimmer h-3.5 w-3/4 rounded" />
      <div className="shimmer mt-2 h-2.5 w-1/3 rounded" />
    </div>
  );
}

export function Sidebar({
  conversations,
  isLoading,
  isError,
  selectedId,
  onSelect,
  onNewChat,
  onClose,
}: {
  conversations: ConversationView[];
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-bg-elev">
      {/* header */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <Brand />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-surface hover:text-ink lg:hidden"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* new conversation */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onNewChat}
          className={[
            "group flex w-full items-center gap-2 rounded-md border border-border-hi",
            "bg-surface px-3 py-2.5 text-[13.5px] text-ink",
            "transition-all duration-150 hover:border-accent hover:bg-surface-hi active:scale-[0.99]",
          ].join(" ")}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-accent text-[#1a1206] transition-transform duration-200 group-hover:rotate-90">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.75} />
          </span>
          New conversation
        </button>
      </div>

      {/* list */}
      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Conversations
        </p>

        {isLoading && (
          <div className="space-y-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <p className="px-3 py-6 text-[12.5px] leading-relaxed text-ink-faint">
            We couldn&apos;t load your conversations. Check your connection and
            try again.
          </p>
        )}

        {!isLoading && !isError && conversations.length === 0 && (
          <p className="px-3 py-6 text-[12.5px] leading-relaxed text-ink-faint">
            No conversations yet. Start one to see it here.
          </p>
        )}

        {!isLoading && !isError && conversations.length > 0 && (
          <div className="space-y-0.5">
            {conversations.map((c, i) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                index={i}
                onSelect={() => onSelect(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* footer */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-[11px] leading-relaxed text-ink-faint">
          Conversations are kept so you can return to them anytime.
        </p>
      </div>
    </div>
  );
}
