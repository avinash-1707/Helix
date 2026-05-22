import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";

// Provider configuration. `name` matches the Provider union from
// @helix/types ('anthropic' | 'openai' | 'google'). API keys are NEVER
// stored here — they are injected via env only (architecture.md).
export const providers = pgTable("providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  baseUrl: text("base_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});
