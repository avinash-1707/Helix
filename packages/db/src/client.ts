import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// Drizzle client factory. The connection string is injected by the
// caller (apps/api, apps/ingestion) after Zod env validation — this
// package never reads process.env at runtime (code-standards.md).
// postgres-js is lazy: no socket opens until the first query.
export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
