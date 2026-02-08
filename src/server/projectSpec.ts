import { PrismaClient, SpecStatus } from "@prisma/client";
import { z } from "zod";

export const SaveProjectBuilderSchema = z.object({
  boardId: z.string().min(1),
  // project
  projectId: z.string().min(1).optional(),
  name: z.string().min(1),
  keyPrefix: z
    .string()
    .min(2)
    .max(8)
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  description: z.string().optional().default(""),
  // spec
  markdown: z.string().optional().default(""),
  mode: z.enum(["draft", "save"]).default("draft"),
});

export async function saveProjectBuilder(prisma: PrismaClient, input: unknown) {
  const data = SaveProjectBuilderSchema.parse(input);

  const status = data.mode === "save" ? SpecStatus.SAVED : SpecStatus.DRAFT;

  // create or update project
  const project = data.projectId
    ? await prisma.project.update({
        where: { id: data.projectId },
        data: {
          name: data.name,
          keyPrefix: data.keyPrefix,
          description: data.description,
        },
      })
    : await prisma.project.upsert({
        where: {
          boardId_keyPrefix: {
            boardId: data.boardId,
            keyPrefix: data.keyPrefix,
          },
        },
        create: {
          boardId: data.boardId,
          name: data.name,
          keyPrefix: data.keyPrefix,
          description: data.description,
          nextSeq: 1,
        },
        update: {
          name: data.name,
          description: data.description,
        },
      });

  // upsert spec 1:1
  const spec = await prisma.projectSpec.upsert({
    where: { projectId: project.id },
    create: {
      projectId: project.id,
      markdown: data.markdown,
      status,
    },
    update: {
      markdown: data.markdown,
      status,
    },
  });

  return {
    project: {
      id: project.id,
      boardId: project.boardId,
      name: project.name,
      keyPrefix: project.keyPrefix,
      description: project.description ?? "",
      nextSeq: project.nextSeq,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    spec: {
      id: spec.id,
      projectId: spec.projectId,
      markdown: spec.markdown,
      status: spec.status,
      createdAt: spec.createdAt.toISOString(),
      updatedAt: spec.updatedAt.toISOString(),
    },
  };
}
