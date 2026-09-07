import { type NextRequest } from "next/server";

function isUnusableHost(host: string) {
  const hostname = host.split(":")[0]?.replace(/^\[|\]$/g, "") ?? "";
  return hostname === "0.0.0.0" || hostname === "::" || hostname === "";
}

export function publicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostHeader = request.headers.get("host")?.trim();

  let envOrigin: URL | null = null;
  const env = process.env.AUTH_URL ?? process.env.APP_URL;
  if (env) {
    try {
      envOrigin = new URL(env);
    } catch {
      envOrigin = null;
    }
  }

  const host = [forwardedHost, hostHeader, envOrigin?.host, request.nextUrl.host].find(
    (value) => value && !isUnusableHost(value),
  );

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : envOrigin?.protocol === "https:"
        ? "https"
        : request.nextUrl.protocol === "https:"
          ? "https"
          : "http";

  if (host) return `${proto}://${host}`;
  return "http://127.0.0.1:43147";
}

export function publicUrl(request: NextRequest, path: string) {
  return new URL(path, `${publicOrigin(request)}/`);
}
