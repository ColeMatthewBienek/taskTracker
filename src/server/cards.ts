import { CardActivityType, Priority, PrismaClient } from "@prisma/client";
import { z } from "zod";
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

export async function createCard(prisma: PrismaClient, input: unknown) {
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

  await logActivity(prisma, {
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

export async function updateCard(prisma: PrismaClient, input: unknown) {
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

  await logActivity(prisma, {
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

export async function moveCard(prisma: PrismaClient, input: unknown) {
  const data = MoveCardSchema.parse(input);
  const before = await prisma.card.findUniqueOrThrow({ where: { id: data.cardId } });

  // NOTE: D1 doesn't support transactions, so we run queries individually.
  // Move card first
  await prisma.card.update({
    where: { id: data.cardId },
    data: { columnId: data.toColumnId },
  });

  // Reorder helper: take a desired ordering list, intersect with actual ids, de-dupe,
  // then append any missing ids (by current order) so we always end up with a total ordering.
  function normalizeOrder(params: {
    desiredIds: string[] | undefined;
    actualIdsInOrder: string[];
  }) {
    const { desiredIds, actualIdsInOrder } = params;
    const actual = new Set(actualIdsInOrder);

    const out: string[] = [];
    const seen = new Set<string>();

    if (desiredIds && desiredIds.length) {
      for (const id of desiredIds) {
        if (!actual.has(id)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
      }
    }

    for (const id of actualIdsInOrder) {
      if (seen.has(id)) continue;
      out.push(id);
    }

    return out;
  }

  // Target column: normalize ordering for ACTIVE (non-archived) cards only.
  const toCards = await prisma.card.findMany({
    where: { columnId: data.toColumnId, archived: false },
    orderBy: { order: "asc" },
  });

  const finalToIds = normalizeOrder({
    desiredIds: data.orderedCardIdsInToColumn,
    actualIdsInOrder: toCards.map((c) => c.id),
  });

  for (let i = 0; i < finalToIds.length; i++) {
    const id = finalToIds[i];
    if (toCards[i]?.id === id && toCards[i]?.order === i) continue;
    await prisma.card.update({ where: { id }, data: { order: i } });
  }

  // Source column: always normalize too (close gaps). Use provided ordering if present.
  const fromCards = await prisma.card.findMany({
    where: { columnId: data.fromColumnId, archived: false },
    orderBy: { order: "asc" },
  });

  const fromActualIds = fromCards.map((c) => c.id).filter((id) => id !== data.cardId);

  const finalFromIds = normalizeOrder({
    desiredIds: data.orderedCardIdsInFromColumn,
    actualIdsInOrder: fromActualIds,
  });

  for (let i = 0; i < finalFromIds.length; i++) {
    const id = finalFromIds[i];
    if (fromCards[i]?.id === id && fromCards[i]?.order === i) continue;
    await prisma.card.update({ where: { id }, data: { order: i } });
  }

  const after = await prisma.card.findUniqueOrThrow({ where: { id: data.cardId } });

  await logActivity(prisma, {
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

export async function setCardArchived(prisma: PrismaClient, input: unknown) {
  const data = ArchiveCardSchema.parse(input);
  const before = await prisma.card.findUniqueOrThrow({ where: { id: data.cardId } });

  // NOTE: D1 doesn't support transactions, so we run queries individually.
  let card;

  if (data.archived) {
    // Archive the card, then close gaps in the active ordering for that column.
    card = await prisma.card.update({
      where: { id: data.cardId },
      data: { archived: true },
    });

    const remaining = await prisma.card.findMany({
      where: { columnId: before.columnId, archived: false },
      orderBy: { order: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await prisma.card.update({ where: { id: remaining[i].id }, data: { order: i } });
      }
    }
  } else {
    // Unarchive: put card at end of active list (max+1) to avoid collisions.
    const maxOrder = await prisma.card.aggregate({
      where: { columnId: before.columnId, archived: false },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    card = await prisma.card.update({
      where: { id: data.cardId },
      data: { archived: false, order: nextOrder },
    });
  }

  await logActivity(prisma, {
    cardId: card.id,
    type: data.archived ? CardActivityType.ARCHIVED : CardActivityType.UNARCHIVED,
    actor: "Cole",
    before: { archived: before.archived, order: before.order, columnId: before.columnId },
    after: { archived: card.archived, order: card.order, columnId: card.columnId },
  });

  return card;
}
