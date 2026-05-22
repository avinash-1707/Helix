// Rate-limit plugin: a per-session sliding-window counter in Redis,
// keyed `rl:{session_id}` (code-standards.md). Only mutating requests
// count against the limit — reads, health, and metrics are exempt.
//
// With no auth model, the session is identified by the `x-session-id`
// header, falling back to the client IP.

import fp from "fastify-plugin";

export const rateLimitPlugin = fp(async (app) => {
  const { rateLimitMax, rateLimitWindowSec } = app.config;

  app.addHook("onRequest", async (req, reply) => {
    if (req.method === "GET" || req.method === "HEAD") return;

    const header = req.headers["x-session-id"];
    const sessionId =
      typeof header === "string" && header.length > 0 ? header : req.ip;
    const key = `rl:${sessionId}`;

    const count = await app.redis.incr(key);
    if (count === 1) {
      // First hit in this window — start the window's TTL.
      await app.redis.expire(key, rateLimitWindowSec);
    }
    if (count > rateLimitMax) {
      await reply.code(429).send({
        error: {
          code: "rate_limited",
          message: "Too many requests — slow down and retry shortly.",
        },
      });
    }
  });
});
