// Redis-backed conversation context cache.
//
// Keyed `ctx:{conversation_id}` (code-standards.md). Holds the trailing
// window of turns sent to the model so a new message does not trigger a
// full DB history rebuild. TTL is 24h (architecture.md storage model);
// a cold conversation falls back to a DB fetch, which is acceptable.
//
// The cache stores RAW message text — Redis is ephemeral, not the
// database, so invariant 2 (no raw PII in the DB) is not in scope here.
// Keeping raw text preserves model response quality on resume.

import type { Redis } from "ioredis";
import type { ChatMessage } from "@helix/sdk";

const CTX_TTL_SECONDS = 60 * 60 * 24;

function ctxKey(conversationId: string): string {
  return `ctx:${conversationId}`;
}

// Returns the cached context window, or null on a cold miss / corrupt entry.
export async function loadContext(
  redis: Redis,
  conversationId: string,
): Promise<ChatMessage[] | null> {
  const raw = await redis.get(ctxKey(conversationId));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : null;
  } catch {
    return null;
  }
}

// Persists the context window, trimmed to the trailing `windowSize` turns.
export async function saveContext(
  redis: Redis,
  conversationId: string,
  messages: ChatMessage[],
  windowSize: number,
): Promise<void> {
  const trimmed = messages.slice(-windowSize);
  await redis.set(
    ctxKey(conversationId),
    JSON.stringify(trimmed),
    "EX",
    CTX_TTL_SECONDS,
  );
}
