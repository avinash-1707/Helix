// Browser-side API client. Every call is same-origin to this app's own
// /api proxy — the gateway is never contacted directly from the page.

import type { Provider } from "@helix/types";
import type {
  ConversationView,
  ConversationDetail,
  ApiErrorBody,
} from "./types";

/** A failed request, carrying a message already safe to show a person. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Maps backend error codes / statuses to calm, non-technical copy. The
// raw `code` is never shown; it only selects a sentence.
function friendlyError(status: number, body: ApiErrorBody | null): ApiError {
  const code = body?.error.code ?? "unknown";
  const message =
    status === 429
      ? "You're sending messages a little fast. Give it a moment and try again."
      : status === 409
        ? "This conversation has been archived and can no longer take messages."
        : status === 404
          ? "We couldn't find that conversation."
          : status === 502 || status === 503
            ? "The service is unavailable right now. Please try again shortly."
            : status >= 500
              ? "Something went wrong on our side. Please try again."
              : "That request couldn't be completed. Please try again.";
  return new ApiError(status, code, message);
}

async function parseError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    /* non-JSON body — fall back to status-based copy */
  }
  return friendlyError(res.status, body);
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { cache: "no-store" });
  } catch {
    throw new ApiError(0, "offline", "You appear to be offline.");
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

/** All conversations, newest first. */
export async function fetchConversations(): Promise<ConversationView[]> {
  const { data } = await getJson<{ data: ConversationView[] }>(
    "/api/conversations",
  );
  return data;
}

/** One conversation plus its full message history. */
export async function fetchConversation(
  id: string,
): Promise<ConversationDetail> {
  const { data } = await getJson<{ data: ConversationDetail }>(
    `/api/conversations/${id}`,
  );
  return data;
}

/** Creates a conversation bound to a model. Returns the new row. */
export async function createConversation(input: {
  provider: Provider;
  model?: string;
  title?: string;
}): Promise<ConversationView> {
  let res: Response;
  try {
    res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError(0, "offline", "You appear to be offline.");
  }
  if (!res.ok) throw await parseError(res);
  const { data } = (await res.json()) as { data: ConversationView };
  return data;
}

/** Archives a conversation: read-only afterwards, never deleted. */
export async function archiveConversation(
  id: string,
): Promise<ConversationView> {
  let res: Response;
  try {
    res = await fetch(`/api/conversations/${id}/cancel`, { method: "POST" });
  } catch {
    throw new ApiError(0, "offline", "You appear to be offline.");
  }
  if (!res.ok) throw await parseError(res);
  const { data } = (await res.json()) as { data: ConversationView };
  return data;
}
