import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { z } from "zod";
import { getPrisma, type CloudflareEnv } from "@/server/db";

export const runtime = "edge";

const CreateSchema = z.object({
  body: z.string().min(1),
  author: z.string().min(1).optional().default("Cole"),
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  body: z.string().min(1),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);
  const { id: cardId } = await params;

  const url = new URL(req.url);
  const order = (url.searchParams.get("order") ?? "asc").toLowerCase();

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);
  const { id: cardId } = await params;

  const data = CreateSchema.parse(await req.json());

  const comment = await prisma.cardComment.create({
    data: {
      cardId,
      author: data.author,
      body: data.body,
    },
  });

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
  const existing = await prisma.cardComment.findUniqueOrThrow({ where: { id: data.id } });
  if (existing.cardId !== cardId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const updated = await prisma.cardComment.update({
    where: { id: data.id },
    data: { body: data.body },
  });

  return NextResponse.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}
