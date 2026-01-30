"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { fetchBoard, reorderColumns, createColumn as apiCreateColumn, createCard as apiCreateCard, moveCard as apiMoveCard } from "./api";
import { useBoardStore } from "./state";
import Column from "./Column";
import CardOverlay from "./CardOverlay";
import CardDrawer from "./CardDrawer";

function getDragType(activeId: string): "column" | "card" {
  return activeId.startsWith("col:") ? "column" : "card";
}

export default function BoardClient() {
  const { board, loading, error, setBoard, setLoading, setError, reorderColumnsLocal, moveCardLocal, reorderCardsLocal, selectedCardId, selectCard } = useBoardStore();

  const [newColumnName, setNewColumnName] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [showArchived, setShowArchived] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const b = await fetchBoard();
        setBoard(b);
        setError(null);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [setBoard, setLoading, setError]);

  const filteredBoard = useMemo(() => {
    if (!board) return null;

    const q = search.trim().toLowerCase();
    const tag = tagFilter.trim().toLowerCase();

    return {
      ...board,
      columns: board.columns.map((c) => ({
        ...c,
        cards: c.cards.filter((card) => {
          if (!showArchived && card.archived) return false;
          if (showArchived && !card.archived) return false;

          if (tag) {
            const tags = (card.tags || []).map((t) => t.toLowerCase());
            if (!tags.includes(tag)) return false;
          }

          if (q) {
            const hay = `${card.title} ${card.description} ${(card.tags || []).join(" ")}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }

          return true;
        }),
      })),
    };
  }, [board, search, tagFilter, showArchived]);

  const allTags = useMemo(() => {
    if (!board) return [] as string[];
    const s = new Set<string>();
    for (const col of board.columns) {
      for (const card of col.cards) {
        for (const t of card.tags || []) s.add(t);
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [board]);

  if (loading) {
    return <div className="text-sm text-zinc-400">Loading…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  if (!filteredBoard) {
    return <div className="text-sm text-zinc-400">No board.</div>;
  }

  const columnIds = filteredBoard.columns.map((c) => `col:${c.id}`);

  async function onCreateColumn() {
    if (!newColumnName.trim()) return;
    if (!board) return;
    await apiCreateColumn(board.id, newColumnName.trim());
    // reload board (simple)
    const b = await fetchBoard();
    setBoard(b);
    setNewColumnName("");
  }

  async function onCreateCard(columnId: string) {
    const title = prompt("Card title?");
    if (!title?.trim()) return;
    await apiCreateCard(columnId, title.trim());
    const b = await fetchBoard();
    setBoard(b);
  }

  function findCard(cardDragId: string) {
    // card ids are `card:<id>`
    const id = cardDragId.replace(/^card:/, "");
    for (const c of board!.columns) {
      const found = c.cards.find((x) => x.id === id);
      if (found) return { card: found, columnId: c.id };
    }
    return null;
  }

  function handleDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    setActiveId(null);
    if (!over) return;

    const activeKey = String(active.id);
    const overKey = String(over.id);

    const type = getDragType(activeKey);

    if (type === "column") {
      const activeColId = activeKey.replace(/^col:/, "");
      const overColId = overKey.replace(/^col:/, "");
      if (activeColId === overColId) return;

      const ids = board!.columns.map((c) => c.id);
      const oldIndex = ids.indexOf(activeColId);
      const newIndex = ids.indexOf(overColId);
      const newIds = arrayMove(ids, oldIndex, newIndex);
      reorderColumnsLocal(newIds);
      reorderColumns(board!.id, newIds).catch(() => {
        // best effort
      });
      return;
    }

    // card
    const from = findCard(activeKey);
    if (!from) return;

    // over can be a card:<id> or col:<id> (drop into column)
    let toColumnId = from.columnId;
    let toIndex = 0;

    if (overKey.startsWith("col:")) {
      toColumnId = overKey.replace(/^col:/, "");
      const toCol = board!.columns.find((c) => c.id === toColumnId);
      toIndex = toCol ? toCol.cards.length : 0;
    } else {
      const overCard = findCard(overKey);
      if (!overCard) return;
      toColumnId = overCard.columnId;
      const toCol = board!.columns.find((c) => c.id === toColumnId);
      toIndex = toCol ? toCol.cards.findIndex((c) => c.id === overCard.card.id) : 0;
    }

    if (toColumnId === from.columnId) {
      const col = board!.columns.find((c) => c.id === from.columnId)!;
      const ids = col.cards.map((c) => c.id);
      const oldIndex = ids.indexOf(from.card.id);
      const newIds = arrayMove(ids, oldIndex, toIndex);
      reorderCardsLocal(from.columnId, newIds);

      apiMoveCard({
        cardId: from.card.id,
        fromColumnId: from.columnId,
        toColumnId,
        orderedCardIdsInToColumn: newIds,
      }).catch(() => {});
      return;
    }

    // cross-column move
    moveCardLocal(from.card.id, from.columnId, toColumnId, toIndex);

    const toCol = board!.columns.find((c) => c.id === toColumnId)!;
    const fromCol = board!.columns.find((c) => c.id === from.columnId)!;

    const orderedTo = toCol.cards.map((c) => c.id);
    const orderedFrom = fromCol.cards.filter((c) => c.id !== from.card.id).map((c) => c.id);

    apiMoveCard({
      cardId: from.card.id,
      fromColumnId: from.columnId,
      toColumnId,
      orderedCardIdsInToColumn: orderedTo,
      orderedCardIdsInFromColumn: orderedFrom,
    }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none placeholder:text-zinc-500"
        />

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Archived only
        </label>

        <div className="ml-auto flex items-center gap-2">
          <input
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="New column…"
            className="h-9 w-48 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none placeholder:text-zinc-500"
          />
          <button
            onClick={onCreateColumn}
            className="h-9 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            Add column
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {filteredBoard.columns.map((col) => (
              <Column
                key={col.id}
                boardId={filteredBoard.id}
                column={col}
                onCreateCard={() => onCreateCard(col.id)}
                onSelectCard={(id) => selectCard(id)}
              />
            ))}
          </SortableContext>
        </div>

        <DragOverlay>{activeId ? <CardOverlay id={activeId} /> : null}</DragOverlay>
      </DndContext>

      <CardDrawer cardId={selectedCardId} onClose={() => selectCard(null)} />
    </div>
  );
}
