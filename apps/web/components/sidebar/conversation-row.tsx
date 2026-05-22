"use client";

// One conversation in the rail. Shows its title, which model it uses, when
// it last moved, and an archived marker for read-only conversations.

import type { ConversationView } from "@/lib/types";
import { displayTitle, relativeTime } from "@/lib/format";
import { modelInfo } from "@/lib/models";
import { ModelDot } from "../model";

export function ConversationRow({
  conversation,
  active,
  index,
  onSelect,
}: {
  conversation: ConversationView;
  active: boolean;
  index: number;
  onSelect: () => void;
}) {
  const archived = conversation.status === "cancelled";
  const { name } = modelInfo(conversation.provider);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
      className={[
        "anim-rise group relative w-full overflow-hidden rounded-md px-3 py-2.5 text-left",
        "transition-colors duration-150",
        active
          ? "bg-surface-hi"
          : "hover:bg-surface",
      ].join(" ")}
    >
      {/* accent edge on the active row */}
      <span
        aria-hidden
        className={[
          "absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent transition-all duration-200",
          active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
        ].join(" ")}
      />
      <div className="flex items-center gap-2">
        <span
          className={[
            "flex-1 truncate text-[13.5px] leading-snug transition-colors",
            active ? "text-ink" : "text-ink-dim group-hover:text-ink",
          ].join(" ")}
        >
          {displayTitle(conversation.title)}
        </span>
        <span className="shrink-0 font-mono text-[10.5px] text-ink-faint">
          {relativeTime(conversation.updatedAt)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <ModelDot provider={conversation.provider} size={6} />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          {name}
        </span>
        {archived && (
          <span className="ml-auto rounded-full bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
            Archived
          </span>
        )}
      </div>
    </button>
  );
}
