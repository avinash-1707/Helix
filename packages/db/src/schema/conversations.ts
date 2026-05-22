import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { ConversationStatus, Provider } from "@helix/types";

// One chat session. See context/architecture.md "Schema Design".
// `provider`/`status` are TEXT columns narrowed to the shared union
// types from @helix/types — the DB stays the single source of values.
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  provider: text("provider").$type<Provider>().notNull(),
  model: text("model").notNull(),
  status: text("status")
    .$type<ConversationStatus>()
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
