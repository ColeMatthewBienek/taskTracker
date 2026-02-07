import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const CreateProjectSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1),
  keyPrefix: z
    .string()
    .min(2)
    .max(8)
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  description: z.string().optional().default(""),
});

export async function createProject(prisma: PrismaClient, input: unknown) {
  const data = CreateProjectSchema.parse(input);

  const p = await prisma.project.create({
    data: {
      boardId: data.boardId,
      name: data.name,
      keyPrefix: data.keyPrefix,
      description: data.description,
      nextSeq: 1,
    },
  });

  return {
    id: p.id,
    boardId: p.boardId,
    name: p.name,
    keyPrefix: p.keyPrefix,
    description: p.description ?? "",
    nextSeq: p.nextSeq,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export async function allocateKeyCode(prisma: PrismaClient, projectId: string) {
  // Get current prefix + seq
  const proj = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

  // Increment seq. D1 has no real transactions; best-effort.
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { nextSeq: { increment: 1 } },
  });

  const seqUsed = updated.nextSeq - 1;
  const keyCode = `${proj.keyPrefix}-${pad3(seqUsed)}`;

  return { keyCode };
}
