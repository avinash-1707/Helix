// Proxy: a single conversation with its full message history.
//   GET /api/conversations/:id

import { gatewayUrl, relayJson, sessionId } from "@/lib/server";
import { isUuid } from "@/lib/format";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json(
      { error: { code: "invalid_request", message: "Unknown conversation." } },
      { status: 400 },
    );
  }

  const sid = await sessionId();
  return relayJson(
    fetch(gatewayUrl(`/conversations/${id}`), {
      headers: { "x-session-id": sid },
      cache: "no-store",
    }),
  );
}
