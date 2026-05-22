import { z } from "zod";
import { ConversationStatusSchema, ProviderSchema } from "./enums.js";

// One chat session. Mirrors the `conversations` table in architecture.md.
export const ConversationSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  provider: ProviderSchema,
  model: z.string().min(1),
  status: ConversationStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Conversation = z.infer<typeof ConversationSchema>;
