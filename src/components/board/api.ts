import type { BoardDTO } from "@/server/types";

export async function fetchBoard(): Promise<BoardDTO> {
  const res = await fetch("/api/board", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load board");
  return (await res.json()) as BoardDTO;
}

export async function createColumn(boardId: string, name: string) {
  const res = await fetch("/api/columns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardId, name }),
  });
  if (!res.ok) throw new Error("Failed to create column");
  return (await res.json()) as any;
}

export async function reorderColumns(boardId: string, orderedColumnIds: string[]) {
  const res = await fetch("/api/columns", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardId, orderedColumnIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder columns");
  return (await res.json()) as any;
}

export async function updateColumn(payload: { id: string; name?: string; wipLimit?: number | null }) {
  const res = await fetch("/api/columns", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update column");
  return (await res.json()) as any;
}

export async function deleteColumn(id: string) {
  const res = await fetch("/api/columns", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Failed to delete column");
  return (await res.json()) as any;
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
  return (await res.json()) as any;
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
  return (await res.json()) as any;
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
  return (await res.json()) as any;
}

export async function setCardArchived(cardId: string, archived: boolean) {
  const res = await fetch("/api/cards", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, archived }),
  });
  if (!res.ok) throw new Error("Failed to archive card");
  return (await res.json()) as any;
}

export async function fetchCardActivity(cardId: string) {
  const res = await fetch(`/api/cards/${cardId}/activity`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load activity");
  return (await res.json()) as any;
}
