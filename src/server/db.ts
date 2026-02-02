import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { D1Database } from "@cloudflare/workers-types";

type PrismaGlobal = { prisma?: PrismaClient };
const globalForPrisma = globalThis as unknown as PrismaGlobal;

export type CloudflareEnv = {
  DB: D1Database;
};

/**
 * Get a Prisma client.
 * - In Cloudflare (Pages/Workers): pass { DB } to use the D1 adapter.
 * - In Node (local dev): call with no args to use the normal Prisma engine + sqlite file.
 */
export function getPrisma(env?: Partial<CloudflareEnv>): PrismaClient {
  if (env?.DB) {
    return new PrismaClient({
      adapter: new PrismaD1(env.DB),
    });
  }

  // Node/local dev: keep a singleton to avoid exhausting connections.
  const prisma = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  return prisma;
}
