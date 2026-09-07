import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function zipPath() {
  const candidates = [
    join(process.cwd(), "deploy-assets", "mp-basketball.zip"),
    join(process.cwd(), "public", "mp-basketball.zip"),
  ];
  return candidates.find((file) => existsSync(file));
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = zipPath();
  if (!file) {
    return new NextResponse("Zip is not on this server yet.", { status: 404 });
  }

  const data = await readFile(file);
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="mp-basketball.zip"',
      "Content-Length": String(data.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
