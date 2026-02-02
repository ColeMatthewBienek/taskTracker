import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createCard, moveCard, setCardArchived, updateCard } from "@/server/cards";
import { getPrisma, type CloudflareEnv } from "@/server/db";

export const runtime = "edge";

export async function POST(req: Request) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);

  const body: any = await req.json();
  const card = await createCard(prisma, body);
  return NextResponse.json(card);
}

export async function PATCH(req: Request) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);

  const body: any = await req.json();

  if (body?.cardId && typeof body.archived === "boolean") {
    const card = await setCardArchived(prisma, body);
    return NextResponse.json(card);
  }

  if (body?.cardId && body?.toColumnId && body?.orderedCardIdsInToColumn) {
    const res = await moveCard(prisma, body);
    return NextResponse.json(res);
  }

  const card = await updateCard(prisma, body);
  return NextResponse.json(card);
}
