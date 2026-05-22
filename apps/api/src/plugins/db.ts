// Database plugin: builds the Drizzle client once and decorates it onto
// the Fastify instance. Registered with `fastify-plugin` so the
// decoration is visible to every route scope (code-standards.md:
// cross-cutting concerns are plugins, not per-handler instantiation).

import fp from "fastify-plugin";
import { createDb } from "@helix/db";

export const dbPlugin = fp(async (app) => {
  app.decorate("db", createDb(app.config.databaseUrl));
});
