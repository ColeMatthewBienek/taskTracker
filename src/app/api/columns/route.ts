import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createColumn, deleteColumn, reorderColumns, updateColumn } from "@/server/columns";
import { getPrisma, type CloudflareEnv } from "@/server/db";

export const runtime = "edge";

export async function POST(req: Request) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);

  const body = await req.json();
  const col = await createColumn(prisma, body);
  return NextResponse.json(col);
}

export async function PATCH(req: Request) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);

  const body = await req.json();
  if (body?.orderedColumnIds) {
    const res = await reorderColumns(prisma, body);
    return NextResponse.json(res);
  }
  const col = await updateColumn(prisma, body);
  return NextResponse.json(col);
}

export async function DELETE(req: Request) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);

  const body = await req.json();
  const res = await deleteColumn(prisma, body);
  return NextResponse.json(res);
}
