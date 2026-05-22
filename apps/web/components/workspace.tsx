"use client";

// Top-level layout. Holds which conversation is open, the model chosen for
// the next new conversation, and the mobile rail state. All data lives in
// TanStack Query; this component only coordinates.

import { useCallback, useEffect, useState } from "react";
import type { Provider } from "@helix/types";
import {
  useConversations,
  useCreateConversation,
} from "@/lib/hooks/use-conversations";
import { titleFromText } from "@/lib/format";
import { Sidebar } from "./sidebar/sidebar";
import { ChatView } from "./chat/chat-view";
import { Welcome } from "./chat/welcome";

// The model choice persists across reloads so it feels like a setting,
// not a surprise reset.
const MODEL_KEY = "helix:model";

function isProvider(v: unknown): v is Provider {
  return v === "anthropic" || v === "openai" || v === "google";
}

export function Workspace() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftModel, setDraftModel] = useState<Provider>("anthropic");
  const [railOpen, setRailOpen] = useState(false);
  const [autoSend, setAutoSend] = useState<{ id: string; text: string } | null>(
    null,
  );

  const conversations = useConversations();
  const createConversation = useCreateConversation();

  // Restore the saved model after mount (avoids an SSR mismatch).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODEL_KEY);
      if (isProvider(saved)) setDraftModel(saved);
    } catch {
      /* storage unavailable — keep the default */
    }
  }, []);

  const changeModel = useCallback((next: Provider) => {
    setDraftModel(next);
    try {
      localStorage.setItem(MODEL_KEY, next);
    } catch {
      /* storage unavailable — selection still applies this session */
    }
  }, []);

  const openConversation = useCallback((id: string) => {
    setSelectedId(id);
    setRailOpen(false);
  }, []);

  const startNew = useCallback(() => {
    setSelectedId(null);
    setRailOpen(false);
  }, []);

  // Create the conversation, then hand its first message to ChatView.
  const beginConversation = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        const conversation = await createConversation.mutateAsync({
          provider: draftModel,
          title: titleFromText(text),
        });
        setAutoSend({ id: conversation.id, text });
        setSelectedId(conversation.id);
        setRailOpen(false);
        return true;
      } catch {
        // Creation failed — the composer keeps the text for a retry.
        return false;
      }
    },
    [createConversation, draftModel],
  );

  const consumeAutoSend = useCallback(() => setAutoSend(null), []);

  // Escape closes the mobile rail.
  useEffect(() => {
    if (!railOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRailOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [railOpen]);

  const rail = (
    <Sidebar
      conversations={conversations.data ?? []}
      isLoading={conversations.isLoading}
      isError={conversations.isError}
      selectedId={selectedId}
      onSelect={openConversation}
      onNewChat={startNew}
      onClose={() => setRailOpen(false)}
    />
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      {/* rail — fixed on desktop */}
      <aside className="hidden w-[300px] shrink-0 border-r border-border lg:block">
        {rail}
      </aside>

      {/* rail — drawer on small screens */}
      <div
        className={[
          "fixed inset-0 z-40 lg:hidden",
          railOpen ? "" : "pointer-events-none",
        ].join(" ")}
      >
        <div
          onClick={() => setRailOpen(false)}
          aria-hidden
          className={[
            "absolute inset-0 bg-black/60 transition-opacity duration-300",
            railOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
        <aside
          role="dialog"
          aria-label="Conversations"
          aria-modal="true"
          className={[
            "absolute inset-y-0 left-0 w-[300px] max-w-[82vw] border-r border-border shadow-2xl",
            "transition-transform duration-300 ease-out",
            railOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          {rail}
        </aside>
      </div>

      {/* surface */}
      <main className="flex min-w-0 flex-1 flex-col">
        {selectedId ? (
          <ChatView
            key={selectedId}
            conversationId={selectedId}
            autoSendText={autoSend?.id === selectedId ? autoSend.text : null}
            onAutoSendConsumed={consumeAutoSend}
            onOpenRail={() => setRailOpen(true)}
          />
        ) : (
          <Welcome
            model={draftModel}
            onModelChange={changeModel}
            onStart={beginConversation}
            starting={createConversation.isPending}
            onOpenRail={() => setRailOpen(true)}
          />
        )}
      </main>
    </div>
  );
}
