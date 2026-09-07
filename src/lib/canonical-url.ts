import { type NextRequest, NextResponse } from "next/server";

function envCanonical(): URL | null {
  const raw = process.env.AUTH_URL ?? process.env.APP_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0" ||
      url.hostname === "::"
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function requestHost(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host
  )
    .split(",")[0]
    ?.trim()
    .split(":")[0]
    ?.toLowerCase();
}

function requestProto(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded === "https" || forwarded === "http") return forwarded;
  return request.nextUrl.protocol === "https:" ? "https" : "http";
}

/** Send every visitor to AUTH_URL (https://www.datosfarm.com) so login cookies match. */
export function canonicalRedirect(request: NextRequest): NextResponse | null {
  const target = envCanonical();
  if (!target) return null;

  const host = requestHost(request);
  if (!host || host === "0.0.0.0" || host === "127.0.0.1" || host === "localhost") {
    return null;
  }

  const proto = requestProto(request);
  const hostMismatch = host !== target.hostname;
  const protoMismatch = target.protocol === "https:" && proto !== "https";
  if (!hostMismatch && !protoMismatch) return null;

  const next = new URL(request.nextUrl.pathname + request.nextUrl.search, target.origin);
  return NextResponse.redirect(next, 308);
}
