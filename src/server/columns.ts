import { z } from "zod";
import { prisma } from "./db";

export const CreateColumnSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1),
  wipLimit: z.number().int().positive().nullable().optional(),
});

export async function createColumn(input: unknown) {
  const data = CreateColumnSchema.parse(input);
  const maxOrder = await prisma.column.aggregate({
    where: { boardId: data.boardId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const col = await prisma.column.create({
    data: {
      boardId: data.boardId,
      name: data.name,
      order: nextOrder,
      wipLimit: data.wipLimit ?? null,
    },
  });

  return col;
}

export const UpdateColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  wipLimit: z.number().int().positive().nullable().optional(),
});

export async function updateColumn(input: unknown) {
  const data = UpdateColumnSchema.parse(input);
  const col = await prisma.column.update({
    where: { id: data.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.wipLimit !== undefined ? { wipLimit: data.wipLimit } : {}),
    },
  });
  return col;
}

export const DeleteColumnSchema = z.object({
  id: z.string().min(1),
});

export async function deleteColumn(input: unknown) {
  const data = DeleteColumnSchema.parse(input);
  // Cascades delete cards + activities via schema relations.
  await prisma.column.delete({ where: { id: data.id } });
  return { ok: true };
}

export const ReorderColumnsSchema = z.object({
  boardId: z.string().min(1),
  orderedColumnIds: z.array(z.string().min(1)).min(1),
});

export async function reorderColumns(input: unknown) {
  const data = ReorderColumnsSchema.parse(input);
  await prisma.$transaction(
    data.orderedColumnIds.map((id, idx) =>
      prisma.column.update({
        where: { id },
        data: { order: idx },
      })
    )
  );
  return { ok: true };
}
