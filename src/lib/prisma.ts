import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isCurrentClient(client: PrismaClient) {
  return (
    typeof client.outboundEmail?.findMany === "function" &&
    typeof client.team?.findMany === "function"
  );
}

const existing = globalForPrisma.prisma;
export const prisma =
  existing && isCurrentClient(existing) ? existing : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
