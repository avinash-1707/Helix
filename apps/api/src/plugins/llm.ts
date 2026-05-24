// LLM plugin: constructs the unified LLMClient from configured provider
// keys and the Kafka emitter settings, and decorates it onto Fastify.
// The client's Kafka producer is disconnected on shutdown.

import fp from "fastify-plugin";
import { LLMClient } from "@helix/sdk";
import type { Provider } from "@helix/types";

export const llmPlugin = fp(async (app) => {
  const cfg = app.config;

  const providers: Partial<Record<Provider, { apiKey: string }>> = {};
  if (cfg.providerKeys.anthropic) {
    providers.anthropic = { apiKey: cfg.providerKeys.anthropic };
  }
  if (cfg.providerKeys.openai) {
    providers.openai = { apiKey: cfg.providerKeys.openai };
  }
  if (cfg.providerKeys.google) {
    providers.google = { apiKey: cfg.providerKeys.google };
  }
  if (cfg.providerKeys.openrouter) {
    providers.openrouter = { apiKey: cfg.providerKeys.openrouter };
  }

  const client = new LLMClient({
    providers,
    kafka: {
      brokers: cfg.kafkaBrokers,
      topic: cfg.kafkaTopicLogs,
      clientId: "helix-api",
    },
  });

  app.decorate("llm", client);
  app.addHook("onClose", async () => {
    await client.close();
  });
});
