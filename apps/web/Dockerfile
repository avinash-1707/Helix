# @helix/web — Next.js 16 chat UI.
# Build context is the monorepo root (see infra/docker-compose.yml): web
# imports @helix/types as workspace source, which Next transpiles at build.
#
# Unlike api/ingestion, web ships a real production build — `next build`
# bundles the workspace source, so `next start` needs no TS runtime.
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

# The browser never calls the gateway directly — it hits this app's own
# /api/* route handlers, which proxy to HELIX_API_URL server-side. So no
# gateway URL needs to be inlined at build time.
RUN pnpm --filter @helix/web build

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]
