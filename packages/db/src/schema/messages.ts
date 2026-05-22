import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { MessageRole } from "@helix/types";
import { conversations } from "./conversations.js";

// One user/assistant/system turn. `content` is PII-redacted before it
// reaches the DB (architecture.md invariant 2). `content_preview` is the
// first 200 chars surfaced on dashboards.
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: text("role").$type<MessageRole>().notNull(),
  content: text("content").notNull(),
  contentPreview: text("content_preview"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
