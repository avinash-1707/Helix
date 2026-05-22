"use client";

// TanStack Query bindings for conversation data.

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { Provider } from "@helix/types";
import {
  fetchConversations,
  fetchConversation,
  createConversation,
  archiveConversation,
} from "../api";
import type { ConversationView, ConversationDetail } from "../types";

export const conversationsKey = ["conversations"] as const;
export const conversationKey = (id: string) => ["conversation", id] as const;

/** The rail list — every conversation, newest first. */
export function useConversations(): UseQueryResult<ConversationView[]> {
  return useQuery({
    queryKey: conversationsKey,
    queryFn: fetchConversations,
  });
}

/** A single conversation with its messages. Disabled when no id is open. */
export function useConversation(
  id: string | null,
): UseQueryResult<ConversationDetail> {
  return useQuery({
    queryKey: conversationKey(id ?? "none"),
    queryFn: () => fetchConversation(id as string),
    enabled: id !== null,
  });
}

/** Creates a conversation and refreshes the rail. */
export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { provider: Provider; title?: string }) =>
      createConversation(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}

/** Archives a conversation and refreshes both the rail and its detail. */
export function useArchiveConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveConversation(id),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: conversationsKey });
      void qc.invalidateQueries({ queryKey: conversationKey(updated.id) });
    },
  });
}
