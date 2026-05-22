// Fastify app assembly. Loads config, decorates it, then registers
// cross-cutting plugins (in dependency order) followed by routes.
//
// All plugins use `fastify-plugin`, so their decorations live on the root
// instance and are visible to every route. Redis is registered before the
// rate-limit plugin because the limiter depends on `app.redis`.

import Fastify, { type FastifyInstance } from "fastify";
import { loadConfig } from "./config.js";
import { dbPlugin } from "./plugins/db.js";
import { llmPlugin } from "./plugins/llm.js";
import { metricsPlugin } from "./plugins/metrics.js";
import { rateLimitPlugin } from "./plugins/rate-limit.js";
import { redisPlugin } from "./plugins/redis.js";
import { conversationRoutes } from "./routes/conversations.js";
import { healthRoutes } from "./routes/health.js";
import { messageRoutes } from "./routes/messages.js";

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();

  const app = Fastify({
    logger: true,
    // LLM calls are slow — bound how long the gateway waits on a request
    // body so a stalled client cannot pin a connection (code-standards.md).
    requestTimeout: config.llmRequestTimeoutMs,
  });
  app.decorate("config", config);

  await app.register(metricsPlugin);
  await app.register(dbPlugin);
  await app.register(redisPlugin);
  await app.register(rateLimitPlugin);
  await app.register(llmPlugin);

  await app.register(healthRoutes);
  await app.register(conversationRoutes);
  await app.register(messageRoutes);

  return app;
}
