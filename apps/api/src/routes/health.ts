// Liveness endpoint. Kept separate from the metrics plugin so probes and
// scraping evolve independently.

import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ data: { status: "ok" } }));
}
