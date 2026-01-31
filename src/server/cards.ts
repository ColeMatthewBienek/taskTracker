import { CardActivityType, Priority } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { logActivity } from "./activity";

const TagArray = z.array(z.string()).default([]);

export const CreateCardSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().default(""),
  tags: TagArray.optional(),
  priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function createCard(input: unknown) {
  const data = CreateCardSchema.parse(input);

  const maxOrder = await prisma.card.aggregate({
    where: { columnId: data.columnId, archived: false },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const card = await prisma.card.create({
    data: {
      columnId: data.columnId,
      order: nextOrder,
      title: data.title,
      description: data.description,
      tags: data.tags ?? [],
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      archived: false,
    },
  });

  await logActivity({
    cardId: card.id,
    type: CardActivityType.CREATED,
    actor: "Cole",
    before: null,
    after: {
      title: card.title,
      description: card.description,
      tags: card.tags,
      priority: card.priority,
      dueDate: card.dueDate,
      columnId: card.columnId,
      order: card.order,
      archived: card.archived,
    },
  });

  return card;
}

export const UpdateCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: TagArray.optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function updateCard(input: unknown) {
  const data = UpdateCardSchema.parse(input);
  const before = await prisma.card.findUniqueOrThrow({ where: { id: data.id } });

  const card = await prisma.card.update({
    where: { id: data.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.tags !== undefined ? { tags: data.tags } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.dueDate !== undefined
        ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
        : {}),
    },
  });

  // Field-level diff (simple)
  const changed: Record<string, { before: any; after: any }> = {};
  for (const key of ["title", "description", "tags", "priority", "dueDate"] as const) {
    const b = (before as any)[key];
    const a = (card as any)[key];
    const bv = b instanceof Date ? b.toISOString() : b;
    const av = a instanceof Date ? a.toISOString() : a;
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      changed[key] = { before: bv, after: av };
    }
  }

  await logActivity({
    cardId: card.id,
    type: CardActivityType.EDITED,
    actor: "Cole",
    before: changed,
    after: null,
  });

  return card;
}

export const MoveCardSchema = z.object({
  cardId: z.string().min(1),
  fromColumnId: z.string().min(1),
  toColumnId: z.string().min(1),
  // ordered card ids within target column after move
  orderedCardIdsInToColumn: z.array(z.string().min(1)),
  // optionally also provide ordering for from column to close gaps
  orderedCardIdsInFromColumn: z.array(z.string().min(1)).optional(),
});

export async function moveCard(input: unknown) {
  const data = MoveCardSchema.parse(input);
  const before = await prisma.card.findUniqueOrThrow({ where: { id: data.cardId } });

  await prisma.$transaction(async (tx) => {
    // move card
    await tx.card.update({
      where: { id: data.cardId },
      data: { columnId: data.toColumnId },
    });

    // reorder target column
    for (let i = 0; i < data.orderedCardIdsInToColumn.length; i++) {
      await tx.card.update({
        where: { id: data.orderedCardIdsInToColumn[i] },
        data: { order: i },
      });
    }

    // reorder source column if provided
    if (data.orderedCardIdsInFromColumn) {
      for (let i = 0; i < data.orderedCardIdsInFromColumn.length; i++) {
        await tx.card.update({
          where: { id: data.orderedCardIdsInFromColumn[i] },
          data: { order: i },
        });
      }
    }
  });

  const after = await prisma.card.findUniqueOrThrow({ where: { id: data.cardId } });

  await logActivity({
    cardId: data.cardId,
    type: CardActivityType.MOVED,
    actor: "Cole",
    before: { columnId: before.columnId, order: before.order },
    after: { columnId: after.columnId, order: after.order },
  });

  return { ok: true };
}

export const ArchiveCardSchema = z.object({
  cardId: z.string().min(1),
  archived: z.boolean(),
});

export async function setCardArchived(input: unknown) {
  const data = ArchiveCardSchema.parse(input);
  const before = await prisma.card.findUniqueOrThrow({ where: { id: data.cardId } });

  const card = await prisma.$transaction(async (tx) => {
    if (data.archived) {
      // Archive the card, then close gaps in the active ordering for that column.
      const updated = await tx.card.update({
        where: { id: data.cardId },
        data: { archived: true },
      });

      const remaining = await tx.card.findMany({
        where: { columnId: before.columnId, archived: false },
        orderBy: { order: "asc" },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i) {
          await tx.card.update({ where: { id: remaining[i].id }, data: { order: i } });
        }
      }

      return updated;
    }

    // Unarchive: put card at end of active list (max+1) to avoid collisions.
    const maxOrder = await tx.card.aggregate({
      where: { columnId: before.columnId, archived: false },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    return tx.card.update({
      where: { id: data.cardId },
      data: { archived: false, order: nextOrder },
    });
  });

  await logActivity({
    cardId: card.id,
    type: data.archived ? CardActivityType.ARCHIVED : CardActivityType.UNARCHIVED,
    actor: "Cole",
    before: { archived: before.archived, order: before.order, columnId: before.columnId },
    after: { archived: card.archived, order: card.order, columnId: card.columnId },
  });

  return card;
}
