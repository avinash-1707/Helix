// Proxy: conversation collection.
//   GET  /api/conversations  → list, newest first
//   POST /api/conversations  → create

import { z } from "zod";
import { gatewayUrl, relayJson, sessionId } from "@/lib/server";

// Re-validated here so a malformed client request fails fast without a
// gateway round-trip. The gateway validates again — defence in depth.
// The provider set is mirrored locally to keep this server route free of
// a runtime import from the shared types package.
const CreateBody = z.object({
  provider: z.enum(["anthropic", "openai", "google"]),
  title: z.string().trim().min(1).max(200).optional(),
});

export async function GET() {
  const sid = await sessionId();
  return relayJson(
    fetch(gatewayUrl("/conversations"), {
      headers: { "x-session-id": sid },
      cache: "no-store",
    }),
  );
}

export async function POST(req: Request) {
  const sid = await sessionId();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json(
      { error: { code: "invalid_request", message: "Malformed request." } },
      { status: 400 },
    );
  }

  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "invalid_request", message: "Invalid request." } },
      { status: 400 },
    );
  }

  return relayJson(
    fetch(gatewayUrl("/conversations"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-id": sid },
      body: JSON.stringify(parsed.data),
    }),
  );
}
