import { NextResponse } from "next/server";
import { getDefaultBoard } from "@/server/board";

export async function GET() {
  const board = await getDefaultBoard();
  return NextResponse.json(board);
}
