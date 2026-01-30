import type { BoardDTO } from "@/server/types";

export async function fetchBoard(): Promise<BoardDTO> {
  const res = await fetch("/api/board", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load board");
  return res.json();
}

export async function createColumn(boardId: string, name: string) {
  const res = await fetch("/api/columns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardId, name }),
  });
  if (!res.ok) throw new Error("Failed to create column");
  return res.json();
}

export async function reorderColumns(boardId: string, orderedColumnIds: string[]) {
  const res = await fetch("/api/columns", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardId, orderedColumnIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder columns");
  return res.json();
}

export async function createCard(payload: {
  columnId: string;
  title: string;
  description?: string;
  tags?: string[];
  priority?: string;
  dueDate?: string | null;
}) {
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create card");
  return res.json();
}

export async function updateCard(payload: {
  id: string;
  title?: string;
  description?: string;
  tags?: string[];
  priority?: string;
  dueDate?: string | null;
}) {
  const res = await fetch("/api/cards", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update card");
  return res.json();
}

export async function moveCard(payload: {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  orderedCardIdsInToColumn: string[];
  orderedCardIdsInFromColumn?: string[];
}) {
  const res = await fetch("/api/cards", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to move card");
  return res.json();
}

export async function setCardArchived(cardId: string, archived: boolean) {
  const res = await fetch("/api/cards", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, archived }),
  });
  if (!res.ok) throw new Error("Failed to archive card");
  return res.json();
}

export async function fetchCardActivity(cardId: string) {
  const res = await fetch(`/api/cards/${cardId}/activity`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load activity");
  return res.json();
}
