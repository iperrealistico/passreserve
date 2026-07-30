import { isProtectedProductionRuntime } from "./passreserve-storage-policy.js";

export const PASSRESERVE_NO_STORE_CACHE_CONTROL = "no-store, max-age=0";
export const PASSRESERVE_SECURITY_HEADER_SOURCE =
  "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)";
export const PASSRESERVE_SENSITIVE_HEADER_SOURCES = [
  "/api/:path*",
  "/admin/:path*",
  "/:slug/admin/:path*",
  "/:slug/events/:eventSlug/register/:path*"
];
export const PASSRESERVE_CSP_BASE = [
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'"
];

function normalizePathname(pathname) {
  if (!pathname) {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function getPathSegments(pathname) {
  return normalizePathname(pathname)
    .split("/")
    .filter(Boolean);
}

function isHttpsLikeRequest({ protocol = "", forwardedProto = "", env = process.env } = {}) {
  return (
    protocol === "https:" ||
    String(forwardedProto || "").toLowerCase() === "https" ||
    isProtectedProductionRuntime(env)
  );
}

export function buildPassreserveSecurityHeaders(options = {}) {
  const secureTransport = isHttpsLikeRequest(options);
  const cspDirectives = PASSRESERVE_CSP_BASE.slice();

  if (secureTransport) {
    cspDirectives.push("upgrade-insecure-requests");
  }

  const headers = {
    "Content-Security-Policy": cspDirectives.join("; "),
    "Origin-Agent-Cluster": "?1",
    "Permissions-Policy":
      "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), usb=(), browsing-topics=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Permitted-Cross-Domain-Policies": "none"
  };

  if (secureTransport) {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload";
  }

  return headers;
}

export function getPassreserveRoutePrivacyPolicy(pathname = "") {
  const normalizedPathname = normalizePathname(pathname);
  const segments = getPathSegments(normalizedPathname);
  const isApiRoute =
    normalizedPathname === "/api" || normalizedPathname.startsWith("/api/");
  const isAdminRoute = segments.includes("admin");
  const isRegistrationRoute = segments.includes("register");
  const isSensitiveRoute = isApiRoute || isAdminRoute || isRegistrationRoute;

  return {
    noIndex: isSensitiveRoute,
    noStore: isSensitiveRoute
  };
}

function toHeaderEntries(headers) {
  return Object.entries(headers).map(([key, value]) => ({
    key,
    value
  }));
}

export function getPassreserveStaticHeaderRules() {
  const securityHeaders = toHeaderEntries(
    buildPassreserveSecurityHeaders({
      protocol: "https:"
    })
  );
  const sensitiveHeaders = toHeaderEntries({
    "Cache-Control": PASSRESERVE_NO_STORE_CACHE_CONTROL,
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    Expires: "0",
    Pragma: "no-cache",
    "X-Robots-Tag": "noindex, nofollow"
  });

  return [
    {
      source: PASSRESERVE_SECURITY_HEADER_SOURCE,
      headers: securityHeaders
    },
    ...PASSRESERVE_SENSITIVE_HEADER_SOURCES.map((source) => ({
      source,
      headers: sensitiveHeaders
    }))
  ];
}
