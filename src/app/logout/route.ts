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
  const login = new URL("/login", request.url);
  const response = NextResponse.redirect(login, 303);
  response.headers.set("Cache-Control", "no-store");

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
