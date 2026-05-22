import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { InferenceStatus, Provider } from "@helix/types";
import { conversations } from "./conversations.js";
import { messages } from "./messages.js";

// One persisted LLM API call. Converted to a TimescaleDB hypertable on
// `request_at` (see migration). Note: NO primary key — TimescaleDB
// requires any unique constraint to include the partitioning column,
// and this table is append-only, so `id` is a plain defaulted UUID.
// Previews are PII-redacted before insert.
export const inferenceLogs = pgTable("inference_logs", {
  id: uuid("id").notNull().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  messageId: uuid("message_id").references(() => messages.id),
  provider: text("provider").$type<Provider>().notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  latencyMs: integer("latency_ms"),
  firstTokenMs: integer("first_token_ms"),
  status: text("status").$type<InferenceStatus>().notNull(),
  errorCode: text("error_code"),
  inputPreview: text("input_preview"),
  outputPreview: text("output_preview"),
  requestAt: timestamp("request_at", { withTimezone: true }).notNull(),
  responseAt: timestamp("response_at", { withTimezone: true }),
});
