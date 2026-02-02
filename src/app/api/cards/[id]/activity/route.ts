import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getPrisma, type CloudflareEnv } from "@/server/db";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);

  const { id } = await params;
  const acts = await prisma.cardActivity.findMany({
    where: { cardId: id },
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json(
    acts.map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    }))
  );
}
