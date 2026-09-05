import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const jar = await cookies();
  for (const cookie of jar.getAll()) {
    if (cookie.name.startsWith("authjs.") || cookie.name.startsWith("next-auth.")) {
      jar.delete(cookie.name);
    }
  }

  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}
