import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 proxy (the renamed middleware convention). Issues a stable,
// http-only session id on the first visit. The id is the browser's
// identity for gateway rate-limiting; it carries no personal data and is
// not readable by client JavaScript.
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("helix_sid")) {
    res.cookies.set("helix_sid", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}

// Skip static assets — only document and API requests need an identity.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
