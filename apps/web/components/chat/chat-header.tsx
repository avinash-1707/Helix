"use client";

// The bar above a conversation: which conversation, which model, and the
// archive control. Archiving asks for a quick confirmation inline.

import { useState } from "react";
import { Archive, Menu } from "lucide-react";
import type { ConversationView } from "@/lib/types";
import { displayTitle } from "@/lib/format";
import { ModelBadge } from "../model";

export function ChatHeader({
  conversation,
  onOpenRail,
  onArchive,
  archiving,
}: {
  conversation: ConversationView;
  onOpenRail: () => void;
  onArchive: () => void;
  archiving: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const archived = conversation.status === "cancelled";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg-elev/80 px-3 backdrop-blur sm:px-5">
      <button
        type="button"
        onClick={onOpenRail}
        aria-label="Open menu"
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-surface hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[14px] font-medium leading-tight text-ink">
          {displayTitle(conversation.title)}
        </h1>
        <div className="mt-0.5 flex items-center gap-2">
          <ModelBadge
            provider={conversation.provider}
            model={conversation.model}
          />
          {archived && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              · Archived
            </span>
          )}
        </div>
      </div>

      {archived ? (
        <span className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          <Archive className="h-3.5 w-3.5" />
          Read only
        </span>
      ) : confirming ? (
        <div className="flex items-center gap-1.5">
          <span className="hidden text-[12px] text-ink-dim sm:inline">
            Archive this conversation?
          </span>
          <button
            type="button"
            onClick={onArchive}
            disabled={archiving}
            className="rounded-md bg-accent px-2.5 py-1.5 text-[12px] font-medium text-[#1a1206] transition-colors hover:bg-accent-hi disabled:opacity-60"
          >
            {archiving ? "Archiving…" : "Archive"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={archiving}
            className="rounded-md border border-border-hi px-2.5 py-1.5 text-[12px] text-ink-dim transition-colors hover:text-ink"
          >
            Keep
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 rounded-md border border-border-hi px-2.5 py-1.5 text-[12px] text-ink-dim transition-all hover:border-border-hi hover:text-ink"
        >
          <Archive className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Archive</span>
        </button>
      )}
    </header>
  );
}
