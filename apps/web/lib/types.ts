// View-layer shapes. These mirror the API payloads after JSON transport,
// where every Date has become an ISO-8601 string. Kept separate from the
// backend Zod types in @helix/types so the UI never assumes Date objects.

import type { Provider, ConversationStatus, MessageRole } from "@helix/types";

export type ConversationView = {
  id: string;
  title: string | null;
  provider: Provider;
  model: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
};

export type MessageView = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

export type ConversationDetail = {
  conversation: ConversationView;
  messages: MessageView[];
};

// Shape of `{ error: { code, message } }` returned by the API gateway.
export type ApiErrorBody = {
  error: { code: string; message: string };
};
