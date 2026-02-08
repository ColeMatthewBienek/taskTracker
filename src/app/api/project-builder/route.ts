import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getPrisma, type CloudflareEnv } from "@/server/db";
import { saveProjectBuilder } from "@/server/projectSpec";

export const runtime = "edge";

export async function POST(req: Request) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);
  const body: any = await req.json();

  // Minimal validation for "save" mode
  if (body?.mode === "save") {
    if (!body?.name || !body?.keyPrefix) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }
  }

  const res = await saveProjectBuilder(prisma, body);
  return NextResponse.json(res);
}
