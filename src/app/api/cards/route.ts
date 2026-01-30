import { NextResponse } from "next/server";
import { createCard, moveCard, setCardArchived, updateCard } from "@/server/cards";

export async function POST(req: Request) {
  const body = await req.json();
  const card = await createCard(body);
  return NextResponse.json(card);
}

export async function PATCH(req: Request) {
  const body = await req.json();

  if (body?.cardId && typeof body.archived === "boolean") {
    const card = await setCardArchived(body);
    return NextResponse.json(card);
  }

  if (body?.cardId && body?.toColumnId && body?.orderedCardIdsInToColumn) {
    const res = await moveCard(body);
    return NextResponse.json(res);
  }

  const card = await updateCard(body);
  return NextResponse.json(card);
}
