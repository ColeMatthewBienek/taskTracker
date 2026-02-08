import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getPrisma, type CloudflareEnv } from "@/server/db";
import { saveProjectBuilder } from "@/server/projectSpec";

export const runtime = "edge";

export async function GET(req: Request) {
  const { env } = getRequestContext<CloudflareEnv>();
  const prisma = getPrisma(env);

  const url = new URL(req.url);
  const boardId = url.searchParams.get("boardId");
  if (!boardId) {
    return NextResponse.json({ error: "missing_boardId" }, { status: 400 });
  }

  const projects = await prisma.project.findMany({
    where: { boardId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: { spec: true },
  });

  return NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      boardId: p.boardId,
      name: p.name,
      keyPrefix: p.keyPrefix,
      description: p.description ?? "",
      nextSeq: p.nextSeq,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      spec: p.spec
        ? {
            id: p.spec.id,
            projectId: p.spec.projectId,
            markdown: p.spec.markdown,
            status: p.spec.status,
            createdAt: p.spec.createdAt.toISOString(),
            updatedAt: p.spec.updatedAt.toISOString(),
          }
        : null,
    })),
  });
}

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
