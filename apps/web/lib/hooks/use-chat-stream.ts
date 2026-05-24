"use client";

// Drives one conversation's live reply: posts a message, streams tokens,
// and reconciles the result into the query cache without a visible flash.

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readSse } from "../sse";
import type { ConversationDetail, MessageView } from "../types";
import { conversationKey, conversationsKey } from "./use-conversations";

export type ChatPhase = "idle" | "opening" | "streaming";

export type StreamingTurn = {
  /** What the person just said — shown immediately, optimistically. */
  userText: string;
  /** The reply, growing token by token. */
  replyText: string;
};

export type ChatStream = {
  phase: ChatPhase;
  turn: StreamingTurn | null;
  error: string | null;
  /** True once at least one token has arrived. */
  replying: boolean;
  send: (text: string) => Promise<boolean>;
  stop: () => void;
  dismissError: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newMessage(
  conversationId: string,
  role: MessageView["role"],
  content: string,
  id?: string,
): MessageView {
  return {
    id: id ?? crypto.randomUUID(),
    conversationId,
    role,
    content,
    createdAt: nowIso(),
  };
}

export function useChatStream(conversationId: string | null): ChatStream {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [turn, setTurn] = useState<StreamingTurn | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  // Latest reply text, mirrored outside React state so finalize can read
  // it synchronously without stale-closure surprises.
  const replyRef = useRef("");

  // Switching conversations cancels any in-flight reply and clears state.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [conversationId]);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    replyRef.current = "";
    setPhase("idle");
    setTurn(null);
    setError(null);
  }, [conversationId]);

  const commitTurn = useCallback(
    (id: string, userText: string, replyText: string, assistantId?: string) => {
      // Fold the finished turn straight into the cached history so the
      // streaming bubbles can be dropped without the messages flickering.
      qc.setQueryData<ConversationDetail>(conversationKey(id), (old) => {
        if (!old) return old;
        const added: MessageView[] = [newMessage(id, "user", userText)];
        if (replyText.length > 0) {
          added.push(newMessage(id, "assistant", replyText, assistantId));
        }
        return { ...old, messages: [...old.messages, ...added] };
      });
      // Background reconcile: real ids, redacted copy, fresh rail order.
      void qc.invalidateQueries({ queryKey: conversationKey(id) });
      void qc.invalidateQueries({ queryKey: conversationsKey });
    },
    [qc],
  );

  const dismissError = useCallback(() => setError(null), []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (rawText: string): Promise<boolean> => {
      const text = rawText.trim();
      if (!conversationId || text.length === 0 || phase !== "idle") {
        return false;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      replyRef.current = "";
      setError(null);
      setTurn({ userText: text, replyText: "" });
      setPhase("opening");

      let res: Response;
      try {
        res = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
          signal: controller.signal,
        });
      } catch {
        // Network failure or an abort before the response — nothing was
        // accepted. Let the composer restore the text.
        abortRef.current = null;
        setTurn(null);
        setPhase("idle");
        if (!controller.signal.aborted) {
          setError("You appear to be offline. Please try again.");
        }
        return false;
      }

      // Rejected before streaming (archived, rate-limited, invalid,
      // missing provider key). Try to pull a structured error from the
      // body — describeStatus is the fallback when there is no envelope.
      if (!res.ok || !res.body) {
        abortRef.current = null;
        setTurn(null);
        setPhase("idle");
        setError(await describeRejection(res));
        return false;
      }

      setPhase("streaming");

      let assistantId: string | undefined;
      let streamError: string | null = null;

      try {
        for await (const frame of readSse(res.body)) {
          if (frame.event === "token") {
            const { text: chunk } = JSON.parse(frame.data) as { text: string };
            replyRef.current += chunk;
            setTurn({ userText: text, replyText: replyRef.current });
          } else if (frame.event === "error") {
            const { code, message } = JSON.parse(frame.data) as {
              code?: string;
              message?: string;
            };
            if (code === "llm_timeout") {
              streamError = "The reply timed out. Please try sending it again.";
            } else if (message && /api key|not configured|unauthorized|401/i.test(message)) {
              streamError = `This model isn't available right now: ${message}`;
            } else {
              streamError = "The reply couldn't be completed. Please try again.";
            }
          } else if (frame.event === "done") {
            const { messageId } = JSON.parse(frame.data) as {
              messageId: string | null;
            };
            assistantId = messageId ?? undefined;
          }
        }
      } catch {
        // An abort here is a deliberate stop — the partial reply is kept.
        // Any other read failure surfaces as a soft error.
        if (!controller.signal.aborted) {
          streamError = "The connection dropped before the reply finished.";
        }
      }

      abortRef.current = null;
      commitTurn(conversationId, text, replyRef.current, assistantId);
      setTurn(null);
      setPhase("idle");
      if (streamError) setError(streamError);
      return true;
    },
    [conversationId, phase, commitTurn],
  );

  return {
    phase,
    turn,
    error,
    replying: phase === "streaming" && (turn?.replyText.length ?? 0) > 0,
    send,
    stop,
    dismissError,
  };
}

async function describeRejection(res: Response): Promise<string> {
  // Try the gateway's `{ error: { code, message } }` envelope first — it
  // carries actionable detail (e.g. which provider has no key).
  try {
    const body = (await res.clone().json()) as {
      error?: { code?: string; message?: string };
    };
    const err = body.error;
    if (err?.code === "provider_not_configured") {
      return err.message ?? "This model isn't configured on the server.";
    }
    if (err?.message) return err.message;
  } catch {
    /* not JSON — fall through to status-based wording */
  }
  return describeStatus(res.status);
}

function describeStatus(status: number): string {
  if (status === 429) {
    return "You're sending messages a little fast. Give it a moment.";
  }
  if (status === 409) {
    return "This conversation is archived and can no longer take messages.";
  }
  if (status === 503) {
    return "This model isn't available on the server right now.";
  }
  return "That message couldn't be sent. Please try again.";
}
