// Conversation business logic. Routes stay thin and delegate here
// (code-standards.md). No HTTP types leak into this module.

import { desc, eq } from "drizzle-orm";
import { conversations, messages, type Db } from "@helix/db";
import type { Conversation, Message, Provider } from "@helix/types";

export type CreateConversationInput = {
  provider: Provider;
  model: string;
  title: string | null;
};

// Inserts a new conversation (status defaults to 'active').
export async function createConversation(
  db: Db,
  input: CreateConversationInput,
): Promise<Conversation> {
  const rows = await db
    .insert(conversations)
    .values({ provider: input.provider, model: input.model, title: input.title })
    .returning();
  const row = rows[0];
  if (!row) throw new Error("conversation insert returned no row");
  return row;
}

// All conversations, newest first (ui-context.md: sidebar list ordering).
export async function listConversations(db: Db): Promise<Conversation[]> {
  return db.select().from(conversations).orderBy(desc(conversations.createdAt));
}

// One conversation by id, or null if it does not exist.
export async function getConversation(
  db: Db,
  id: string,
): Promise<Conversation | null> {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
  return rows[0] ?? null;
}

// Full message history for a conversation, oldest first.
export async function getMessages(
  db: Db,
  conversationId: string,
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

// Marks a conversation cancelled. Cancel never deletes the row — a
// cancelled conversation stays listable and viewable (code-standards.md).
// Returns null if the id does not exist.
export async function cancelConversation(
  db: Db,
  id: string,
): Promise<Conversation | null> {
  const rows = await db
    .update(conversations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(conversations.id, id))
    .returning();
  return rows[0] ?? null;
}
