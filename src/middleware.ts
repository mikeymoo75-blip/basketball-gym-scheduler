import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const loggedIn = Boolean(req.auth?.user);
  const isLogin = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth");

  if (isAuthApi || pathname === "/logout" || pathname === "/copy-to-vm" || pathname === "/api/vm-zip") {
    return NextResponse.next();
  }

  if (!loggedIn && !isLogin) {
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/admin") && req.auth?.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/schedule", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logout|copy-to-vm|api/vm-zip|.*\\.(?:svg|png|jpg|jpeg|gif|webp|zip)$).*)"],
};
