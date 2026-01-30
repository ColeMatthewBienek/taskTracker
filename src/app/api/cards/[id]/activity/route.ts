import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
