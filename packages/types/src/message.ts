import { z } from "zod";
import { MessageRoleSchema } from "./enums.js";

// One user/assistant/system turn. Mirrors the `messages` table.
// `content` is the PII-redacted version — raw input never reaches the DB.
export const MessageSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  contentPreview: z.string().nullable(),
  createdAt: z.date(),
});
export type Message = z.infer<typeof MessageSchema>;
