import { type NextRequest, NextResponse } from "next/server";

const KNOWN_AUTH_COOKIES = [
  "authjs.session-token",
  "authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.session-token",
  "__Secure-authjs.csrf-token",
  "__Secure-authjs.callback-url",
  "__Host-authjs.session-token",
  "next-auth.session-token",
  "next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.session-token",
];

function isAuthCookie(name: string) {
  return name.includes("authjs") || name.includes("next-auth");
}

function loginLocation(request: NextRequest) {
  const env = process.env.AUTH_URL ?? process.env.APP_URL;
  if (env) {
    try {
      return new URL("/login", env.endsWith("/") ? env : `${env}/`).toString();
    } catch {
      // fall through
    }
  }
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    ?.trim();
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host && !host.startsWith("0.0.0.0") && host !== "localhost") {
    const scheme = proto === "http" ? "http" : "https";
    return `${scheme}://${host}/login`;
  }
  return "/login";
}

function clearCookie(response: NextResponse, name: string, secure: boolean) {
  response.cookies.set(name, "", {
    expires: new Date(0),
    maxAge: 0,
    path: "/",
    secure,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function GET(request: NextRequest) {
  const dest = loginLocation(request);
  const safeHref = dest.replace(/"/g, "");
  const response = new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${safeHref}"><title>Signing out</title></head><body style="font-family:system-ui,sans-serif;padding:2rem"><p><a href="${safeHref}">Continue to sign in</a></p></body></html>`,
    {
      status: 303,
      headers: {
        Location: dest,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );

  const names = new Set(KNOWN_AUTH_COOKIES);
  for (const cookie of request.cookies.getAll()) {
    if (isAuthCookie(cookie.name)) names.add(cookie.name);
  }

  const forwardedHttps = request.headers.get("x-forwarded-proto") === "https";
  for (const name of names) {
    const mustSecure =
      name.startsWith("__Secure-") || name.startsWith("__Host-") || forwardedHttps;
    clearCookie(response, name, mustSecure);
    if (!mustSecure) {
      clearCookie(response, name, true);
    }
  }

  return response;
}
