// Conversation CRUD routes. Handlers stay thin: validate input, delegate
// to the conversation service, map the result to a consistent response
// shape — `{ data }` on success, `{ error: { code, message } }` on
// failure (code-standards.md).

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ProviderSchema } from "@helix/types";
import {
  cancelConversation,
  createConversation,
  getConversation,
  getMessages,
  listConversations,
} from "../services/conversation-service.js";
import { DEFAULT_MODELS } from "../services/models.js";

const CreateBody = z.object({
  provider: ProviderSchema,
  model: z.string().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
});

const IdParam = z.object({ id: z.uuid() });

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  // Create a conversation. Model defaults per provider when omitted.
  app.post("/conversations", async (req, reply) => {
    const body = CreateBody.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: { code: "invalid_request", message: z.prettifyError(body.error) },
      });
    }
    const { provider, title } = body.data;
    const model = body.data.model ?? DEFAULT_MODELS[provider];
    const conversation = await createConversation(app.db, {
      provider,
      model,
      title: title ?? null,
    });
    return reply.code(201).send({ data: conversation });
  });

  // List all conversations, newest first.
  app.get("/conversations", async () => {
    return { data: await listConversations(app.db) };
  });

  // Fetch one conversation with its full message history.
  app.get("/conversations/:id", async (req, reply) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({
        error: { code: "invalid_request", message: "Invalid conversation id" },
      });
    }
    const conversation = await getConversation(app.db, params.data.id);
    if (!conversation) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Conversation not found" },
      });
    }
    const messages = await getMessages(app.db, conversation.id);
    return { data: { conversation, messages } };
  });

  // Cancel a conversation. Idempotent: cancelling an already-cancelled
  // conversation returns the row unchanged. Never deletes.
  app.post("/conversations/:id/cancel", async (req, reply) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({
        error: { code: "invalid_request", message: "Invalid conversation id" },
      });
    }
    const existing = await getConversation(app.db, params.data.id);
    if (!existing) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Conversation not found" },
      });
    }
    const conversation = await cancelConversation(app.db, params.data.id);
    return { data: conversation };
  });
}
