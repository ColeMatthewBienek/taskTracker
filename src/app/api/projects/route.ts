import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createProject } from "@/server/projects";
import { getPrisma, type CloudflareEnv } from "@/server/db";

export const runtime = "edge";

export async function POST(req: Request) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);

  const body = await req.json();
  const project = await createProject(prisma, body);
  return NextResponse.json(project);
}
