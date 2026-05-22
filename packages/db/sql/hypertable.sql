-- TimescaleDB hypertable conversion for inference_logs.
-- Run AFTER `drizzle-kit push` has created the base tables.
-- Idempotent: safe to re-run on every Docker boot.
--
-- Why a separate step: drizzle-kit push only syncs plain Postgres DDL.
-- create_hypertable is a TimescaleDB function and must run against an
-- already-created table. See context/architecture.md "Storage Model".

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Partition inference_logs by request_at for fast time-range queries
-- (Grafana dashboards). migrate_data => TRUE handles a non-empty table;
-- if_not_exists => TRUE makes the call idempotent.
SELECT create_hypertable(
  'inference_logs',
  'request_at',
  if_not_exists => TRUE,
  migrate_data  => TRUE
);
