import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { z } from "zod";
import { getPrisma, type CloudflareEnv } from "@/server/db";
import type { D1Database } from "@cloudflare/workers-types";

export const runtime = "edge";

const CreateSchema = z.object({
  body: z.string().min(1),
  author: z.string().min(1).optional().default("Cole"),
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  body: z.string().min(1),
});

async function ensureCommentsSchema(db: D1Database) {
  // Self-heal for prod: if migrations weren't applied to D1 yet, create the table.
  // Safe to run repeatedly.
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS "CardComment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "cardId" TEXT NOT NULL,
        "author" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "CardComment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE INDEX IF NOT EXISTS "CardComment_cardId_createdAt_idx" ON "CardComment"("cardId", "createdAt")`
    )
    .run();
}

function isMissingCommentsTableError(e: any) {
  const msg = String(e?.message ?? e);
  return msg.includes("no such table") && msg.toLowerCase().includes("cardcomment");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);
  const { id: cardId } = await params;

  const url = new URL(req.url);
  const order = (url.searchParams.get("order") ?? "asc").toLowerCase();

  try {
    const comments = await prisma.cardComment.findMany({
      where: { cardId },
      orderBy: { createdAt: order === "desc" ? "desc" : "asc" },
    });

    return NextResponse.json(
      comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))
    );
  } catch (e: any) {
    if (!isMissingCommentsTableError(e)) throw e;
    await ensureCommentsSchema((env as any).DB as D1Database);
    const comments = await prisma.cardComment.findMany({
      where: { cardId },
      orderBy: { createdAt: order === "desc" ? "desc" : "asc" },
    });
    return NextResponse.json(
      comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);
  const { id: cardId } = await params;

  const data = CreateSchema.parse(await req.json());

  let comment;
  try {
    comment = await prisma.cardComment.create({
      data: {
        cardId,
        author: data.author,
        body: data.body,
      },
    });
  } catch (e: any) {
    if (!isMissingCommentsTableError(e)) throw e;
    await ensureCommentsSchema((env as any).DB as D1Database);
    comment = await prisma.cardComment.create({
      data: {
        cardId,
        author: data.author,
        body: data.body,
      },
    });
  }

  return NextResponse.json({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);
  const { id: cardId } = await params;

  const data = UpdateSchema.parse(await req.json());

  // ensure comment belongs to card
  let existing;
  try {
    existing = await prisma.cardComment.findUniqueOrThrow({ where: { id: data.id } });
  } catch (e: any) {
    if (!isMissingCommentsTableError(e)) throw e;
    await ensureCommentsSchema((env as any).DB as D1Database);
    existing = await prisma.cardComment.findUniqueOrThrow({ where: { id: data.id } });
  }

  if (existing.cardId !== cardId) {
    return new NextResponse("Not found", { status: 404 });
  }

  let updated;
  try {
    updated = await prisma.cardComment.update({
      where: { id: data.id },
      data: { body: data.body },
    });
  } catch (e: any) {
    if (!isMissingCommentsTableError(e)) throw e;
    await ensureCommentsSchema((env as any).DB as D1Database);
    updated = await prisma.cardComment.update({
      where: { id: data.id },
      data: { body: data.body },
    });
  }

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
