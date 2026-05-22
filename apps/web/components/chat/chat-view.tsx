"use client";

// A single open conversation: header, transcript, and composer. Bridges
// the cached history with the live streaming reply.

import { useEffect, useRef, type ReactNode } from "react";
import { AlertCircle, X } from "lucide-react";
import { useConversation, useArchiveConversation } from "@/lib/hooks/use-conversations";
import { useChatStream } from "@/lib/hooks/use-chat-stream";
import type { DisplayMessage } from "./message-list";
import { MessageList } from "./message-list";
import { ChatHeader } from "./chat-header";
import { Composer } from "./composer";

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6">
      <p className="max-w-sm text-center text-[14px] leading-relaxed text-ink-dim">
        {children}
      </p>
    </div>
  );
}

export function ChatView({
  conversationId,
  autoSendText,
  onAutoSendConsumed,
  onOpenRail,
}: {
  conversationId: string;
  autoSendText: string | null;
  onAutoSendConsumed: () => void;
  onOpenRail: () => void;
}) {
  const detail = useConversation(conversationId);
  const stream = useChatStream(conversationId);
  const archive = useArchiveConversation();

  // Fire the carried-over first message exactly once for a just-created
  // conversation.
  const autoSent = useRef(false);
  useEffect(() => {
    if (autoSendText && !autoSent.current) {
      autoSent.current = true;
      void stream.send(autoSendText);
      onAutoSendConsumed();
    }
  }, [autoSendText, stream, onAutoSendConsumed]);

  const conversation = detail.data?.conversation;
  const provider = conversation?.provider ?? "anthropic";
  const archived = conversation?.status === "cancelled";

  // Cached history + the in-flight turn, merged for display.
  const messages: DisplayMessage[] = (detail.data?.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    time: m.createdAt,
  }));
  if (stream.turn) {
    messages.push({
      id: "__turn_user",
      role: "user",
      content: stream.turn.userText,
    });
    if (stream.turn.replyText.length > 0) {
      messages.push({
        id: "__turn_assistant",
        role: "assistant",
        content: stream.turn.replyText,
        streaming: true,
      });
    }
  }
  const thinking = stream.turn !== null && stream.turn.replyText.length === 0;
  const conversationEmpty =
    !detail.isLoading && !detail.isError && messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {conversation ? (
        <ChatHeader
          conversation={conversation}
          onOpenRail={onOpenRail}
          onArchive={() => archive.mutate(conversationId)}
          archiving={archive.isPending}
        />
      ) : (
        <div className="flex h-14 shrink-0 items-center border-b border-border bg-bg-elev/80 px-5">
          <div className="shimmer h-3.5 w-40 rounded" />
        </div>
      )}

      {/* transcript */}
      {detail.isLoading ? (
        <PanelMessage>Opening your conversation…</PanelMessage>
      ) : detail.isError ? (
        <PanelMessage>
          We couldn&apos;t open this conversation. It may have been removed, or
          your connection dropped.
        </PanelMessage>
      ) : conversationEmpty ? (
        <PanelMessage>
          This is the beginning of your conversation. Say something below to
          get started.
        </PanelMessage>
      ) : (
        <MessageList
          messages={messages}
          provider={provider}
          thinking={thinking}
        />
      )}

      {/* composer area */}
      <div className="shrink-0 border-t border-border bg-bg-elev/60 px-4 pb-4 pt-3 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {stream.error && (
            <div className="anim-fade mb-2 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-ink">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
              <span className="flex-1 leading-relaxed">{stream.error}</span>
              <button
                type="button"
                onClick={stream.dismissError}
                aria-label="Dismiss"
                className="-mr-1 -mt-0.5 rounded p-0.5 text-ink-faint transition-colors hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {archived ? (
            <div className="rounded-lg border border-border bg-surface px-4 py-3 text-center text-[13px] leading-relaxed text-ink-dim">
              This conversation is archived. You can still read it, but no new
              messages can be added.
            </div>
          ) : (
            <Composer
              onSend={stream.send}
              onStop={stream.stop}
              streaming={stream.phase === "streaming"}
              busy={stream.phase !== "idle"}
              disabled={detail.isError}
              autoFocus
              placeholder="Write a message…"
            />
          )}
        </div>
      </div>
    </div>
  );
}
