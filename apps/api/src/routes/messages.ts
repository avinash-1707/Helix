// Message streaming route — the SSE path.
//
// Kept in its own file: SSE and non-streaming logic must not share a
// handler (code-standards.md). The flow per turn:
//   1. validate, load conversation, reject if cancelled
//   2. persist the user turn (PII-redacted) to the DB
//   3. assemble the context window (Redis, DB fallback on a cold miss)
//   4. stream the model response to the client as SSE events
//   5. persist the assistant turn (even a partial one) and refresh Redis
//
// The SDK emits exactly one Kafka log event per call after the stream
// ends — including the 'cancelled' case when the client disconnects and
// the for-await loop breaks early (architecture.md invariants 1 & 5).

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ABORT_CLIENT_CLOSED,
  ABORT_TIMEOUT,
  type ChatMessage,
} from "@helix/sdk";
import {
  getConversation,
  getMessages,
} from "../services/conversation-service.js";
import { loadContext, saveContext } from "../services/context-cache.js";
import { addMessage } from "../services/message-service.js";

const IdParam = z.object({ id: z.uuid() });
const SendBody = z.object({
  content: z.string().min(1).max(8000),
  maxTokens: z.number().int().positive().max(8192).optional(),
});

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  app.post("/conversations/:id/messages", async (req, reply) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) {
      return reply.code(400).send({
        error: { code: "invalid_request", message: "Invalid conversation id" },
      });
    }
    const body = SendBody.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({
        error: { code: "invalid_request", message: z.prettifyError(body.error) },
      });
    }

    const conversationId = params.data.id;
    const conversation = await getConversation(app.db, conversationId);
    if (!conversation) {
      return reply.code(404).send({
        error: { code: "not_found", message: "Conversation not found" },
      });
    }
    // Cancelled conversations are read-only (ai-workflow-rules.md).
    if (conversation.status === "cancelled") {
      return reply.code(409).send({
        error: {
          code: "conversation_cancelled",
          message: "Cannot post to a cancelled conversation.",
        },
      });
    }

    // Refuse early — before hijack — if the provider has no API key on the
    // server. Otherwise the SDK throws mid-stream and the client only sees
    // a generic "stream failed" with no actionable info.
    if (!app.llm.hasProvider(conversation.provider)) {
      return reply.code(503).send({
        error: {
          code: "provider_not_configured",
          message: `No API key configured for ${conversation.provider}. Set the server env var and retry.`,
        },
      });
    }

    // Persist the user turn (redacted) before streaming so it survives a
    // mid-stream disconnect.
    await addMessage(app.db, conversationId, "user", body.data.content);

    // Build the context window. Redis holds raw text; a cold miss rebuilds
    // from the (redacted) DB history — an accepted degradation.
    let context = await loadContext(app.redis, conversationId);
    if (context === null) {
      const history = await getMessages(app.db, conversationId);
      context = history.map<ChatMessage>((m) => ({
        role: m.role,
        content: m.content,
      }));
    }
    context.push({ role: "user", content: body.data.content });
    const windowed = context.slice(-app.config.contextWindowSize);

    // Hand the response socket over to manual SSE writes.
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // Disable proxy buffering so tokens reach the browser immediately.
      "X-Accel-Buffering": "no",
    });

    // One controller drives upstream cancellation for both reasons we
    // care about: the browser disconnected, or the server-side deadline
    // elapsed. Aborting tears down the provider HTTPS request so we stop
    // generating (and billing) tokens — not just forwarding them.
    const controller = new AbortController();
    let clientGone = false;
    let timedOut = false;

    req.raw.on("close", () => {
      clientGone = true;
      if (!controller.signal.aborted) controller.abort(ABORT_CLIENT_CLOSED);
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort(ABORT_TIMEOUT);
    }, app.config.llmRequestTimeoutMs);

    const write = (event: string, data: unknown): void => {
      if (clientGone) return;
      try {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch {
        clientGone = true;
      }
    };

    let assistantText = "";
    try {
      const stream = app.llm.stream({
        provider: conversation.provider,
        model: conversation.model,
        messages: windowed,
        conversationId,
        messageId: null,
        signal: controller.signal,
      });
      for await (const token of stream) {
        assistantText += token;
        write("token", { text: token });
      }
    } catch (err) {
      // A client-close abort is expected — the browser is already gone,
      // so writing an error frame is moot (it would no-op anyway). A
      // timeout is a real failure we want surfaced. Anything else is a
      // genuine provider/SDK error.
      if (timedOut) {
        write("error", {
          code: "llm_timeout",
          message: "The model response timed out.",
        });
      } else if (!clientGone) {
        app.log.error({ err, conversationId }, "LLM stream failed");
        const message =
          err instanceof Error && err.message
            ? err.message
            : "The model request failed.";
        write("error", { code: "llm_error", message });
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // Persist the assistant turn (partial output on cancel/error is still
    // worth keeping) and refresh the Redis context window.
    let assistantMessageId: string | null = null;
    if (assistantText.length > 0) {
      const assistantMsg = await addMessage(
        app.db,
        conversationId,
        "assistant",
        assistantText,
      );
      assistantMessageId = assistantMsg.id;
      context.push({ role: "assistant", content: assistantText });
    }
    await saveContext(
      app.redis,
      conversationId,
      context,
      app.config.contextWindowSize,
    );

    write("done", { messageId: assistantMessageId });
    if (!clientGone) {
      try {
        reply.raw.end();
      } catch {
        /* socket already closed */
      }
    }
  });
}
