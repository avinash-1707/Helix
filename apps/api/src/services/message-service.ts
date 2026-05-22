// Message persistence. Every turn stored here is PII-redacted first —
// raw user input never reaches the database (architecture.md invariant 2).

import { eq } from "drizzle-orm";
import { conversations, messages, type Db } from "@helix/db";
import { redactPII } from "@helix/sdk/redaction";
import type { Message, MessageRole } from "@helix/types";

const PREVIEW_CHARS = 200;

// Inserts one redacted message and bumps the parent conversation's
// `updated_at` so the sidebar re-sorts. `rawContent` is redacted here;
// callers pass the original text.
export async function addMessage(
  db: Db,
  conversationId: string,
  role: MessageRole,
  rawContent: string,
): Promise<Message> {
  const content = redactPII(rawContent);
  const rows = await db
    .insert(messages)
    .values({
      conversationId,
      role,
      content,
      contentPreview: content.slice(0, PREVIEW_CHARS),
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("message insert returned no row");

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return row;
}
