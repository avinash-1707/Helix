// Minimal HTTP surface for the ingestion service. It does NOT serve the
// frontend (architecture.md boundary) — it exposes only `/metrics` for
// Prometheus scraping and `/health` for liveness probes.

import Fastify, { type FastifyInstance } from "fastify";
import { registry } from "./metrics.js";

export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ data: { status: "ok" } }));

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", registry.contentType);
    return registry.metrics();
  });

  return app;
}
