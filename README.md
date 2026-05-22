# Helix

Full-stack observability platform for LLM-powered applications. Helix wraps
multi-provider LLM calls (Anthropic, OpenAI, Google) in a lightweight SDK,
captures inference metadata — latency, token usage, errors, session IDs —
and ships it asynchronously to an ingestion pipeline backed by PostgreSQL.
A Next.js chatbot UI demonstrates the SDK; Grafana dashboards expose
real-time latency, throughput, and error metrics.

The design goal: production-grade observability over LLM calls **without
adding latency to the user-facing response path**.

---

## Table of Contents

- [Setup](#setup)
- [Architecture Overview](#architecture-overview)
- [Schema Design Decisions](#schema-design-decisions)
- [Architecture Notes](#architecture-notes)
  - [Ingestion Flow](#ingestion-flow)
  - [Logging Strategy](#logging-strategy)
  - [Scaling Considerations](#scaling-considerations)
  - [Failure Handling Assumptions](#failure-handling-assumptions)
- [Tradeoffs Made](#tradeoffs-made)
- [What I Would Improve With More Time](#what-i-would-improve-with-more-time)

---

## Setup

### Prerequisites

- **Docker** + **Docker Compose** (v2.24+) — the one-command path
- For local dev outside Docker: **Node >= 22**, **pnpm 10.33.2**
  (`corepack enable && corepack prepare pnpm@10.33.2 --activate`)

### Quick start

```bash
# 1. Create the env file (provider keys are optional)
cp .env.example .env
#    then edit .env and set the keys you have:
#      ANTHROPIC_API_KEY=...   OPENAI_API_KEY=...   GOOGLE_API_KEY=...
#    GOOGLE_API_KEY is the Gemini key. A provider with no key just
#    cannot be selected for a conversation.

# 2. Build and start the full stack
docker compose -f infra/docker-compose.yml up --build

# 3. Open the chat UI
#      http://localhost:3000

# Stop everything (add -v to also wipe the data volumes)
docker compose -f infra/docker-compose.yml down
```

If you change provider keys in `.env` after the stack is up, recreate
the gateway so it reloads them: `docker compose -f infra/docker-compose.yml
up -d api`.

This starts everything with **no manual steps**. Two one-shot init
containers run first and exit:

- `migrate` — `drizzle-kit push` (schema sync) + `hypertable.sql`
  (TimescaleDB hypertable conversion)
- `redpanda-init` — creates the `llm.inference.logs` (24h retention) and
  `llm.inference.dlq` Kafka topics

The application services wait on infra health checks **and** both init
containers completing before they start.

Without provider keys the stack still boots — a provider with no key
configured simply cannot be selected for a conversation.

### Service URLs

| Service       | URL                     | Notes                          |
| ------------- | ----------------------- | ------------------------------ |
| Web (chat UI) | http://localhost:3000   |                                |
| API gateway   | http://localhost:3001   | `/health`, `/metrics`          |
| Ingestion     | http://localhost:3002   | `/health`, `/metrics`          |
| Grafana       | http://localhost:3003   | anonymous viewer; admin/admin  |
| Prometheus    | http://localhost:9090   |                                |
| Postgres      | localhost:5433          | `helix` / `helix`              |
| Redis         | localhost:6380          |                                |
| Redpanda      | localhost:19093         | external Kafka listener        |

Postgres, Redis, and Redpanda are mapped to non-standard host ports
(`5433` / `6380` / `19093`) so they do not clash with a host-native
Postgres/Redis/broker. The Helix services reach them over the Compose
network on their normal ports (`postgres:5432`, etc.) regardless.

### Local development (without Docker)

Postgres, Redis, and Redpanda still need to run (use the compose file for
just those, or local installs). Then:

```bash
pnpm install
pnpm --filter @helix/db db:push          # sync schema
psql "$DATABASE_URL" -f packages/db/sql/hypertable.sql
pnpm dev                                  # turbo runs all apps in watch mode
```

All environment variables are documented in `.env.example` and validated
at startup with Zod — the process exits fast on a missing/invalid key.

### Common commands

```bash
pnpm build       # turbo build — all six packages
pnpm typecheck   # tsc --noEmit across the monorepo
pnpm test        # vitest (types + sdk)
pnpm dev         # all apps in watch mode
```

---

## Architecture Overview

Helix is a **Turborepo pnpm monorepo** with three apps and three shared
packages.

```
/
├── apps/
│   ├── web/         # Next.js 16 chat UI (App Router, Turbopack)
│   ├── api/         # Fastify API gateway — conversation CRUD, SSE
│   └── ingestion/   # Kafka consumer + PostgreSQL writer
├── packages/
│   ├── sdk/         # Unified multi-provider LLM client + redaction
│   ├── db/          # Drizzle ORM schema + TimescaleDB hypertable SQL
│   └── types/       # Shared Zod schemas + inferred TypeScript types
└── infra/
    ├── docker-compose.yml   # local one-run stack
    ├── k8s/                 # Helm charts for EKS (one per service)
    └── grafana/             # dashboards + provisioning
```

### Data flow

```
User → Next.js (SSE) → Fastify API Gateway → SDK Wrapper → LLM Provider
                                                  │
                                       Kafka: llm.inference.logs
                                                  │
                                     Ingestion Service → PostgreSQL → Grafana
```

The user response path and the log write path are **fully decoupled**.
The SDK emits one Kafka event per call, fire-and-forget; ingestion
consumes and persists out-of-band. A broker outage never blocks a reply.

### System boundaries

- **`apps/web`** — UI only. Talks exclusively to its own same-origin
  `/api/*` route handlers, which proxy to the gateway server-side
  (`lib/server.ts`). The browser never sees the gateway URL and never
  touches the DB or Kafka.
- **`apps/api`** — conversation CRUD, message persistence, SSE streaming,
  Redis context cache. Imports `packages/sdk` to make LLM calls. Does
  **not** write `inference_logs` directly.
- **`apps/ingestion`** — the only writer of `inference_logs`. Consumes
  Kafka, validates, redacts, persists. Serves no HTTP to the frontend.
- **`packages/sdk`** — pure TypeScript, no HTTP layer. One file per
  provider behind a single `LLMClient` interface.
- **`packages/db`** — Drizzle schema (source of truth) + the one piece of
  hand-written SQL (hypertable conversion).
- **`packages/types`** — Zod schemas shared everywhere; no duplicated
  type definitions across apps.

### Stack

Next.js 16 · Fastify 5 · Drizzle ORM · PostgreSQL + TimescaleDB ·
Redis · Redpanda (Kafka-compatible) · Prometheus + Grafana ·
Docker Compose (local) · AWS EKS + Helm (production target).

---

## Schema Design Decisions

Four tables in PostgreSQL. Full DDL in `context/architecture.md`.

| Table            | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `conversations`  | One row per chat session (provider, model, status).  |
| `messages`       | Every user/assistant/system turn. Content is redacted.|
| `inference_logs` | One row per LLM API call. **TimescaleDB hypertable.** |
| `providers`      | Provider configuration (name, base URL, active flag).|

**`inference_logs` is a TimescaleDB hypertable on `request_at`.** The
Grafana dashboards are almost entirely time-bucketed queries (p50/p95/p99
latency over time, throughput per minute). A hypertable partitions by
time automatically, making those range scans orders of magnitude faster
than a plain table — without changing the query API. This is the one
schema decision that drove a technology choice.

**`inference_logs` has no primary key.** TimescaleDB hypertables cannot
carry a primary key that excludes the partitioning column. The table keeps
an `id` with a default but no PK constraint; idempotency is handled
upstream via the Kafka payload's `eventId`.

**Schema synced with `drizzle-kit push`, no migration files.** For a
one-run Docker setup, syncing Drizzle definitions directly is simpler than
a migration history. The Drizzle schema in `packages/db/src/schema/` is
the single source of truth. The only hand-written SQL is
`sql/hypertable.sql` — `create_hypertable` is a TimescaleDB function that
must run after the base table exists, and is idempotent so it can run on
every boot. (Tradeoff: no rollback story — see below.)

**Stored content is always PII-redacted.** `messages.content` and the
`input_preview` / `output_preview` columns on `inference_logs` only ever
hold redacted text. Previews are capped (~200 chars) — enough for a
dashboard glance, not a full transcript.

**Drizzle over Prisma.** Lighter, better TypeScript inference, closer to
raw SQL. Tradeoff: smaller ecosystem.

---

## Architecture Notes

### Ingestion Flow

1. An LLM call completes inside the SDK (`apps/api` made the call).
2. The SDK measures `firstTokenMs` / `latencyMs`, builds one
   `KafkaLogPayload` (a versioned envelope: `schemaVersion`, `eventId`,
   `emittedAt` + the call metadata), redacts the previews, and emits it
   to the `llm.inference.logs` topic — **fire-and-forget**.
3. `apps/ingestion` consumes the topic. `processMessage` runs the
   pipeline: JSON parse → `KafkaLogPayloadSchema` Zod validation → PII
   redaction (second layer) → insert into `inference_logs` via Drizzle.
4. The DB write is retried up to **3×**. Validation failures or persistent
   write failures are routed to the **`llm.inference.dlq`** topic with
   `x-dlq-*` headers carrying the original raw bytes.
5. `processMessage` **never throws** — every path resolves to either a
   write or a DLQ route, so the kafkajs consumer offset always advances
   and the loop never stalls.

Grafana reflects new calls within seconds of the DB write.

### Logging Strategy

- **One Kafka message per LLM call.** Emitted exactly once, after the
  stream closes (or errors, or is cancelled) — never mid-stream.
- **Asynchronous, never blocking.** The emit is fire-and-forget with a
  2000ms timeout on the producer `send()`. If Kafka is slow or down, the
  SDK logs to stderr and moves on — the user already has their response.
- **Two redaction layers.** PII (email, phone, SSN, credit card) is
  redacted once in the SDK before emit, and again in ingestion before the
  DB write. Defense in depth: a raw payload never reaches the database
  even if one layer is bypassed. Redaction logic is a single shared module
  (`packages/sdk/src/redaction.ts`).
- **Status is always captured.** Success, error, and cancelled calls all
  produce a log row. Cancelled/errored calls keep whatever partial
  metadata and output were captured up to that point.
- **Prometheus metrics** are exposed separately from the Kafka log path —
  `helix_api_*` from the gateway, `helix_ingestion_*` from ingestion —
  scraped every 10s and visualised in Grafana.

### Scaling Considerations

- **Decoupled write path.** Because logging goes through Kafka, the
  ingestion service scales independently of the gateway. Under load,
  add ingestion consumers in the same consumer group — Redpanda
  rebalances partitions across them.
- **Redpanda partitioning.** The `llm.inference.logs` topic can be
  partitioned (keyed by `conversationId`) to parallelise consumption
  while preserving per-conversation ordering.
- **Stateless services.** `web`, `api`, and `ingestion` hold no local
  state — all state is in Postgres / Redis / Kafka — so they scale
  horizontally behind a load balancer (the EKS deployment target).
- **TimescaleDB** keeps time-range dashboard queries fast as
  `inference_logs` grows; retention/compression policies can cap storage.
- **Redis context cache** removes a DB round-trip on every message. The
  trailing-N-message window is read from `ctx:{id}` (TTL 24h); a cold miss
  falls back to the DB.
- **Backpressure.** Kafka is the buffer — an ingestion slowdown grows
  consumer lag rather than dropping data or stalling user responses.
- Current limits: single-node Redpanda/Postgres/Redis in the local
  compose; rate limiting is a per-session sliding window in Redis.

### Failure Handling Assumptions

- **Kafka unreachable** → the SDK catches the emit error, logs to stderr,
  continues. The log event is dropped; the user response is unaffected.
  This is invariant #1: *the log write path never blocks the user
  response.*
- **LLM provider error** → the SDK still emits a log event with
  `status: 'error'` and an `error_code`, then propagates the error to the
  gateway, which returns `502` to the frontend.
- **Conversation cancelled** → the gateway closes the SSE stream and sets
  `status='cancelled'`. Partial assistant output is persisted; the SDK
  emits a `cancelled` log event. Cancel never deletes — a cancelled
  conversation stays listable and viewable; posting to it returns `409`.
- **Ingestion DB write fails** → retried 3×, then the message goes to the
  DLQ topic. `processMessage` never throws, so the consumer never crashes.
- **Invalid Kafka payload** (fails Zod validation) → routed straight to
  the DLQ; not retried.
- **Cold context cache** (conversation older than the 24h Redis TTL) →
  the context window is rebuilt from redacted DB history. Accepted minor
  quality degradation rather than an error.
- **Client disconnect mid-stream** → the gateway detects the dropped
  connection, aborts the upstream LLM call, and the SDK emits a
  `cancelled` log.

---

## Tradeoffs Made

- **`drizzle-kit push`, no migration files.** Simple for a one-run setup;
  no rollback story or schema history. A production deploy would want
  versioned migrations.
- **Fire-and-forget logging.** Guarantees the user response is never
  blocked, but a Kafka outage means log events are *dropped*, not queued —
  observability data can be lost during an incident. Acceptable because
  observability is non-critical relative to the user reply.
- **No authentication.** Single-user / internal-tool assumption. All
  conversations are globally accessible; there is no ownership model. Rate
  limiting is per-session only.
- **Compiled `dist/` vs `tsx` in Docker.** The shared packages expose
  TypeScript source directly (`package.json main → src/*.ts`), so
  `api`/`ingestion` run under `tsx` in their containers rather than a
  compiled build. Simpler workspace wiring; slightly heavier runtime than
  a bundled artifact. `web` ships a real `next build`.
- **Redpanda over Kafka.** Single binary, no ZooKeeper — great for local
  dev. Kafka-compatible API means a production Kafka swap is config-only.
- **SSE over WebSockets.** Streaming is one-directional (server → client);
  SSE is simpler to proxy through Traefik and needs no persistent socket.
- **Drizzle over Prisma.** Lighter and better-typed; smaller ecosystem.
- **Single-node infra in compose.** One Postgres / Redis / Redpanda node —
  fine for local dev, not HA.
- **Raw text in the Redis context cache.** `ctx:{id}` holds un-redacted
  message text (Redis is ephemeral, not "the database") to keep model
  responses high quality; the DB copy is always redacted.

## What I Would Improve With More Time

- **Versioned DB migrations** with a rollback path, replacing
  `drizzle-kit push` for any non-local environment.
- **Durable log delivery** — a local disk spool or outbox so a Kafka
  outage delays rather than drops observability data.
- **Verify the EKS deployment end to end** — the Helm charts
  (`infra/k8s/`) are written but not yet applied to a live cluster;
  `helm lint`/`helm template` and a real `helm install` need a pass.
- **HA data stores on EKS** — the `postgres`/`redis`/`redpanda` charts are
  single-node StatefulSets; move to managed RDS / ElastiCache / MSK.
- **Verify the Grafana dashboards** against a live stack — the JSON is
  committed (`infra/grafana/dashboards/`) but not yet confirmed with
  metrics actually flowing.
- **KEDA lag-based ingestion autoscaling** — the current HPA scales on
  CPU; a Kafka consumer-lag trigger would scale on the real signal.
- **Authentication and a per-user ownership model**, so conversations
  are scoped rather than globally visible.
- **End-to-end and integration tests** — currently only `types` and `sdk`
  have unit tests; the API gateway, ingestion pipeline, and SSE path need
  coverage.
- **Idempotent ingestion** — use the payload `eventId` to dedupe so a
  Kafka redelivery cannot create a duplicate `inference_logs` row.
- **DLQ tooling** — a consumer/UI to inspect and replay dead-lettered
  payloads instead of leaving them on the topic.
- **Tracing** — propagate a trace ID from the browser through the gateway,
  SDK, Kafka, and ingestion for true end-to-end request correlation.
- **Multi-node infra** in compose (or a staging profile) to exercise
  partition rebalancing and failover before EKS.
