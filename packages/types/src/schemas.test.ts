import { describe, it, expect } from "vitest";
import {
  ConversationSchema,
  MessageSchema,
  InferenceLogSchema,
  LLMCallMetadataSchema,
  KafkaLogPayloadSchema,
  KAFKA_LOG_SCHEMA_VERSION,
} from "./index.js";

const UUID = "00000000-0000-4000-8000-000000000000";

describe("ConversationSchema", () => {
  it("accepts a valid conversation", () => {
    const parsed = ConversationSchema.parse({
      id: UUID,
      title: null,
      provider: "anthropic",
      model: "claude-sonnet",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(parsed.provider).toBe("anthropic");
  });

  it("rejects an unknown provider", () => {
    expect(() =>
      ConversationSchema.parse({
        id: UUID,
        title: null,
        provider: "mistral",
        model: "x",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });
});

describe("MessageSchema", () => {
  it("accepts a valid message", () => {
    const parsed = MessageSchema.parse({
      id: UUID,
      conversationId: UUID,
      role: "user",
      content: "hello",
      contentPreview: null,
      createdAt: new Date(),
    });
    expect(parsed.role).toBe("user");
  });
});

describe("InferenceLogSchema / LLMCallMetadataSchema", () => {
  const log = {
    conversationId: UUID,
    messageId: UUID,
    provider: "openai" as const,
    model: "gpt-4.1",
    promptTokens: 10,
    completionTokens: 20,
    latencyMs: 350,
    firstTokenMs: 80,
    status: "success" as const,
    errorCode: null,
    inputPreview: "hi",
    outputPreview: "hello",
    requestAt: new Date(),
    responseAt: new Date(),
  };

  it("InferenceLog requires an id", () => {
    expect(() => InferenceLogSchema.parse(log)).toThrow();
    expect(InferenceLogSchema.parse({ ...log, id: UUID }).id).toBe(UUID);
  });

  it("LLMCallMetadata is the id-less capture shape", () => {
    expect(LLMCallMetadataSchema.parse(log).model).toBe("gpt-4.1");
  });

  it("rejects negative token counts", () => {
    expect(() =>
      InferenceLogSchema.parse({ ...log, id: UUID, promptTokens: -1 }),
    ).toThrow();
  });
});

describe("KafkaLogPayloadSchema", () => {
  it("accepts a valid wire payload with ISO timestamps", () => {
    const parsed = KafkaLogPayloadSchema.parse({
      schemaVersion: KAFKA_LOG_SCHEMA_VERSION,
      eventId: UUID,
      emittedAt: "2026-05-22T12:00:00.000Z",
      conversationId: UUID,
      messageId: null,
      provider: "google",
      model: "gemini",
      promptTokens: null,
      completionTokens: null,
      latencyMs: null,
      firstTokenMs: null,
      status: "cancelled",
      errorCode: null,
      inputPreview: null,
      outputPreview: null,
      requestAt: "2026-05-22T12:00:00.000Z",
      responseAt: null,
    });
    expect(parsed.status).toBe("cancelled");
  });

  it("rejects a Date object where an ISO string is required", () => {
    expect(() =>
      KafkaLogPayloadSchema.parse({
        schemaVersion: KAFKA_LOG_SCHEMA_VERSION,
        eventId: UUID,
        emittedAt: new Date(),
        conversationId: null,
        messageId: null,
        provider: "anthropic",
        model: "claude-sonnet",
        promptTokens: null,
        completionTokens: null,
        latencyMs: null,
        firstTokenMs: null,
        status: "error",
        errorCode: "rate_limit",
        inputPreview: null,
        outputPreview: null,
        requestAt: new Date(),
        responseAt: null,
      }),
    ).toThrow();
  });
});
