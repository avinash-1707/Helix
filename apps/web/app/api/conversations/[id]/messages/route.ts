// Proxy: send a message and stream the reply.
//   POST /api/conversations/:id/messages
//
// Kept in its own route handler — streaming and non-streaming logic must
// not share a handler. The gateway answers with `text/event-stream`; this
// pipes that body straight through. When the browser aborts, `req.signal`
// aborts the upstream fetch, which the gateway reads as a stop request.

import { z } from "zod";
import { gatewayUrl, sessionId } from "@/lib/server";
import { isUuid } from "@/lib/format";

// Mirror of the gateway's contract. The 8000-char cap matches the gateway
// so oversized input is rejected before it leaves this process.
const SendBody = z.object({
  content: z.string().min(1).max(8000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json(
      { error: { code: "invalid_request", message: "Unknown conversation." } },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json(
      { error: { code: "invalid_request", message: "Malformed request." } },
      { status: 400 },
    );
  }

  const parsed = SendBody.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "invalid_request",
          message: "Your message is empty or too long.",
        },
      },
      { status: 400 },
    );
  }

  const sid = await sessionId();

  let upstream: Response;
  try {
    upstream = await fetch(gatewayUrl(`/conversations/${id}/messages`), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-session-id": sid },
      body: JSON.stringify(parsed.data),
      // Browser disconnect → upstream abort → gateway sees the stop.
      signal: req.signal,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "upstream_unreachable",
          message: "We could not reach the service. Please try again.",
        },
      },
      { status: 502 },
    );
  }

  // A non-stream response means the gateway rejected the turn (e.g. 409
  // archived, 429 rate-limited). Relay it as JSON for the client to read.
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.includes("text/event-stream")) {
    const text = await upstream.text();
    return new Response(text || "{}", {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
