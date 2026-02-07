import type { PrismaClient } from "@prisma/client";
import type { BoardDTO } from "./types";

function jsonTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === "string") as string[];
  return [];
}

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

export async function getDefaultBoard(prisma: PrismaClient): Promise<BoardDTO> {
  let board = await prisma.board.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: {
          cards: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!board) {
    board = await prisma.board.create({
      data: {
        name: "Taskboard",
        columns: {
          create: [
            { name: "Backlog", order: 0 },
            { name: "In Progress", order: 1 },
            { name: "Done", order: 2 },
          ],
        },
      },
      include: {
        columns: {
          orderBy: { order: "asc" },
          include: { cards: { orderBy: { order: "asc" } } },
        },
      },
    });
  }


  const projects = await prisma.project.findMany({
    where: { boardId: board.id },
    orderBy: { createdAt: "asc" },
  });
  return {
    id: board.id,
    name: board.name,
    projects: projects.map((p) => ({
      id: p.id,
      boardId: p.boardId,
      name: p.name,
      keyPrefix: p.keyPrefix,
      description: p.description ?? "",
      nextSeq: p.nextSeq,
      createdAt: toIsoOrNull(p.createdAt) ?? new Date().toISOString(),
      updatedAt: toIsoOrNull(p.updatedAt) ?? new Date().toISOString(),
    })),
    columns: board.columns.map((c) => ({
      id: c.id,
      name: c.name,
      order: c.order,
      wipLimit: c.wipLimit,
      boardId: c.boardId,
      cards: c.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        tags: jsonTags(card.tags),
        priority: card.priority,
        dueDate: toIsoOrNull(card.dueDate),
        archived: card.archived,
        createdAt: toIsoOrNull(card.createdAt) ?? new Date().toISOString(),
        updatedAt: toIsoOrNull(card.updatedAt) ?? new Date().toISOString(),
        columnId: card.columnId,
        projectId: (card as any).projectId ?? null,
        keyCode: (card as any).keyCode ?? null,
        order: card.order,
      })),
    })),
  };
}
