import { defineConfig } from "drizzle-kit";

// drizzle-kit CLI config (push/studio). DATABASE_URL is read here only —
// this is a build-time CLI, not application runtime code. Schema is
// synced with `drizzle-kit push`; the TimescaleDB hypertable conversion
// runs separately via sql/hypertable.sql after push.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://helix:helix@localhost:5432/helix",
  },
});
