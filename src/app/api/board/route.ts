import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getDefaultBoard } from "@/server/board";
import { getPrisma, type CloudflareEnv } from "@/server/db";

export const runtime = "edge";

export async function GET() {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);
  const board = await getDefaultBoard(prisma);
  return NextResponse.json(board);
}
