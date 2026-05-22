# @helix/ingestion — Kafka consumer + PostgreSQL writer.
# Build context is the monorepo root (see infra/docker-compose.yml) so the
# whole pnpm workspace is available: ingestion imports @helix/sdk (redaction),
# @helix/db and @helix/types as workspace source, not published packages.
#
# Runs under tsx, not a compiled `dist/`: the workspace packages expose
# TypeScript source directly, so `node dist/index.js` cannot resolve them.
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/ingestion

EXPOSE 3002

CMD ["pnpm", "exec", "tsx", "src/index.ts"]
