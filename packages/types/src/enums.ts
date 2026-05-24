import { z } from "zod";

// LLM provider identifiers. Lowercase, used as DB values and wire values.
export const ProviderSchema = z.enum(["anthropic", "openai", "google", "openrouter"]);
export type Provider = z.infer<typeof ProviderSchema>;

// Conversation lifecycle. Cancelled conversations are read-only, not deleted.
export const ConversationStatusSchema = z.enum(["active", "cancelled"]);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

// Message author role.
export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

// Outcome of a single LLM API call.
export const InferenceStatusSchema = z.enum([
  "success",
  "error",
  "cancelled",
]);
export type InferenceStatus = z.infer<typeof InferenceStatusSchema>;
