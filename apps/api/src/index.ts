// @helix/api — Fastify API gateway entrypoint.
//
// Conversation CRUD, SSE message streaming, Redis context cache, and
// per-session rate limiting. Imports the SDK to make LLM calls; never
// writes `inference_logs` directly (architecture.md boundary).

import "dotenv/config";
import { buildApp } from "./app.js";
import { logger } from "./logger.js";

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ host: "0.0.0.0", port: app.config.port });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    try {
      // app.close() runs onClose hooks: Redis quit, LLM Kafka disconnect.
      await app.close();
    } catch (err) {
      logger.error({ err }, "error during shutdown");
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  logger.error({ err }, "fatal: api failed to start");
  process.exit(1);
});
