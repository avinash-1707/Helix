// Startup environment validation for the API gateway. Required keys are
// checked with Zod; the process exits fast on a missing/invalid value
// (code-standards.md). Provider API keys are optional — a provider with
// no key configured simply cannot be selected for a conversation.

import { z } from "zod";
import type { Provider } from "@helix/types";

// Provider keys are optional. An empty string in .env (`OPENAI_API_KEY=`)
// arrives as `""`, which would fail `.min(1)` — coerce blank → undefined
// so a blank entry is treated as "not configured" rather than invalid.
const optionalKey = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().min(1).optional(),
);

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_TOPIC_LOGS: z.string().min(1).default("llm.inference.logs"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  ANTHROPIC_API_KEY: optionalKey,
  OPENAI_API_KEY: optionalKey,
  GOOGLE_API_KEY: optionalKey,
  // Number of trailing messages sent to the model per turn (architecture.md
  // "short conversational context window").
  CONTEXT_WINDOW_SIZE: z.coerce.number().int().positive().default(10),
  // Per-session rate limit: max mutating requests per sliding window.
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(60),
  // Upper bound on a single LLM stream before the gateway abandons it.
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
});

export type ApiConfig = {
  databaseUrl: string;
  redisUrl: string;
  kafkaBrokers: string[];
  kafkaTopicLogs: string;
  port: number;
  providerKeys: Partial<Record<Provider, string>>;
  contextWindowSize: number;
  rateLimitMax: number;
  rateLimitWindowSec: number;
  llmRequestTimeoutMs: number;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    console.error(
      "[helix-api] invalid environment:\n" + z.prettifyError(parsed.error),
    );
    process.exit(1);
  }
  const e = parsed.data;

  const providerKeys: Partial<Record<Provider, string>> = {};
  if (e.ANTHROPIC_API_KEY) providerKeys.anthropic = e.ANTHROPIC_API_KEY;
  if (e.OPENAI_API_KEY) providerKeys.openai = e.OPENAI_API_KEY;
  if (e.GOOGLE_API_KEY) providerKeys.google = e.GOOGLE_API_KEY;

  return {
    databaseUrl: e.DATABASE_URL,
    redisUrl: e.REDIS_URL,
    kafkaBrokers: e.KAFKA_BROKERS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    kafkaTopicLogs: e.KAFKA_TOPIC_LOGS,
    port: e.API_PORT,
    providerKeys,
    contextWindowSize: e.CONTEXT_WINDOW_SIZE,
    rateLimitMax: e.RATE_LIMIT_MAX,
    rateLimitWindowSec: e.RATE_LIMIT_WINDOW_SEC,
    llmRequestTimeoutMs: e.LLM_REQUEST_TIMEOUT_MS,
  };
}
