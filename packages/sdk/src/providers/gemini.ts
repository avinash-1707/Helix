// Google (Gemini) provider. Wraps @google/genai streaming.
// Gemini uses role names "user" / "model" and carries the system prompt
// in a separate `systemInstruction` config field.

import { GoogleGenAI } from "@google/genai";
import type { Content } from "@google/genai";
import type { LLMProvider, ProviderRequest, ProviderStreamChunk } from "./types.js";

export class GeminiProvider implements LLMProvider {
  readonly name = "google" as const;
  readonly #client: GoogleGenAI;

  constructor(apiKey: string) {
    this.#client = new GoogleGenAI({ apiKey });
  }

  async *stream(req: ProviderRequest): AsyncIterable<ProviderStreamChunk> {
    const systemParts: string[] = [];
    const contents: Content[] = [];
    for (const m of req.messages) {
      if (m.role === "system") {
        systemParts.push(m.content);
        continue;
      }
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }

    let promptTokens: number | null = null;
    let completionTokens: number | null = null;

    const stream = await this.#client.models.generateContentStream({
      model: req.model,
      contents,
      config: {
        maxOutputTokens: req.maxTokens,
        ...(systemParts.length > 0
          ? { systemInstruction: systemParts.join("\n\n") }
          : {}),
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        yield { type: "text", text };
      }
      const usage = chunk.usageMetadata;
      if (usage) {
        promptTokens = usage.promptTokenCount ?? null;
        completionTokens = usage.candidatesTokenCount ?? null;
      }
    }

    yield { type: "usage", promptTokens, completionTokens };
  }
}
