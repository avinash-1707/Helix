// Redis plugin: one shared ioredis connection for the context cache and
// rate limiter. Closed on Fastify shutdown via the `onClose` hook.

import fp from "fastify-plugin";
import { Redis } from "ioredis";

export const redisPlugin = fp(async (app) => {
  const redis = new Redis(app.config.redisUrl, {
    // Fail fast on a request rather than queueing forever if Redis is down.
    maxRetriesPerRequest: 3,
  });
  redis.on("error", (err) => {
    app.log.error({ err }, "redis connection error");
  });
  app.decorate("redis", redis);
  app.addHook("onClose", async () => {
    await redis.quit();
  });
});
