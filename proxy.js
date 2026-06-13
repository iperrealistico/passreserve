import { NextResponse } from "next/server";

import { applyPassreserveSecurityHeaders } from "./lib/passreserve-http-security.js";

export function proxy(request) {
  const response = NextResponse.next();

  return applyPassreserveSecurityHeaders(response, request.nextUrl.pathname, {
    protocol: request.nextUrl.protocol,
    forwardedProto: request.headers.get("x-forwarded-proto")
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
