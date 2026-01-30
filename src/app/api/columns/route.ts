import { NextResponse } from "next/server";
import { createColumn, deleteColumn, reorderColumns, updateColumn } from "@/server/columns";

export async function POST(req: Request) {
  const body = await req.json();
  const col = await createColumn(body);
  return NextResponse.json(col);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (body?.orderedColumnIds) {
    const res = await reorderColumns(body);
    return NextResponse.json(res);
  }
  const col = await updateColumn(body);
  return NextResponse.json(col);
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const res = await deleteColumn(body);
  return NextResponse.json(res);
}
