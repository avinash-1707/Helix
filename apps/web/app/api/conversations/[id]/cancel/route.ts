// Proxy: archive a conversation (the gateway's cancel endpoint). The
// conversation is never deleted — it becomes read-only and stays listable.
//   POST /api/conversations/:id/cancel

import { gatewayUrl, relayJson, sessionId } from "@/lib/server";
import { isUuid } from "@/lib/format";

export async function POST(
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
    fetch(gatewayUrl(`/conversations/${id}/cancel`), {
      method: "POST",
      headers: { "x-session-id": sid },
    }),
  );
}
