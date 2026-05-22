// Module augmentation: declares the decorations the API gateway adds to
// every Fastify instance. The clients themselves are attached by the
// plugins under `src/plugins/` (all registered with `fastify-plugin`, so
// the decorations propagate to the root instance and every route scope).

import type { Db } from "@helix/db";
import type { LLMClient } from "@helix/sdk";
import type { Redis } from "ioredis";
import type { ApiConfig } from "./config.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiConfig;
    db: Db;
    redis: Redis;
    llm: LLMClient;
  }
}
