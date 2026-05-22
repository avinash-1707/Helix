# @helix/api — Fastify API gateway.
# Build context is the monorepo root (see infra/docker-compose.yml) so the
# whole pnpm workspace is available: api imports @helix/sdk, @helix/db and
# @helix/types as workspace source, not published packages.
#
# The service runs under tsx rather than a compiled `dist/`: the workspace
# packages expose TypeScript source directly (their package.json `main`
# points at `src/*.ts`), so a plain `node dist/index.js` cannot resolve
# them. tsx executes the TS entrypoint and its workspace imports as-is.
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# Copy the full workspace. .dockerignore strips node_modules/dist/.turbo.
COPY . .

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["pnpm", "exec", "tsx", "src/index.ts"]
