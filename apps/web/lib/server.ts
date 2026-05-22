// Server-only helpers shared by the route handlers under app/api/.
// The browser never talks to the API gateway directly — it talks to this
// app's own /api routes, which proxy through here. That keeps the gateway
// URL off the client and gives one place to attach the session identity.

import { cookies } from "next/headers";

// The gateway base URL is a server-side secret-ish value: prefer a
// server-only var, fall back to the public one used in local dev.
const API_BASE = (
  process.env.HELIX_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/+$/, "");

const SESSION_COOKIE = "helix_sid";

/**
 * Stable per-browser identity. The gateway rate-limits on `x-session-id`,
 * so a missing cookie must still resolve to *some* value — a fresh random
 * id is fine; it just starts that request on its own clean bucket.
 */
export async function sessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const fresh = crypto.randomUUID();
  try {
    jar.set(SESSION_COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch {
    // cookies() is read-only in some contexts; the value is still usable.
  }
  return fresh;
}

/** Builds an absolute gateway URL from a path. */
export function gatewayUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Forwards a JSON response from the gateway back to the browser verbatim:
 * same status, parsed body re-serialised. On a transport failure returns a
 * generic 502 — internal error detail never crosses this boundary.
 */
export async function relayJson(upstream: Promise<Response>): Promise<Response> {
  try {
    const res = await upstream;
    const text = await res.text();
    return new Response(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
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
}
