import type { PrismaClient } from "@prisma/client";
import type { BoardDTO } from "./types";

function jsonTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter((t) => typeof t === "string") as string[];
  return [];
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

  return {
    id: board.id,
    name: board.name,
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
        dueDate: card.dueDate ? card.dueDate.toISOString() : null,
        archived: card.archived,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
        columnId: card.columnId,
        order: card.order,
      })),
    })),
  };
}
