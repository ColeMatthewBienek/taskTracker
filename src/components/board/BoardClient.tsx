"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import {
  fetchBoard,
  reorderColumns,
  createColumn as apiCreateColumn,
  createProject as apiCreateProject,
  createCard as apiCreateCard,
  moveCard as apiMoveCard,
} from "./api";
import { useBoardStore } from "./state";
import Column from "./Column";
import CardOverlay from "./CardOverlay";
import CardDrawer from "./CardDrawer";

function getDragType(activeId: string): "column" | "card" {
  return activeId.startsWith("col:") ? "column" : "card";
}

export default function BoardClient() {
  const {
    board,
    loading,
    error,
    setBoard,
    setLoading,
    setError,
    addColumnLocal,
    addCardLocal,
    reorderColumnsLocal,
    moveCardLocal,
    reorderCardsLocal,
    selectedCardId,
    selectCard,
  } = useBoardStore();

  const [newColumnName, setNewColumnName] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPrefix, setNewProjectPrefix] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const scrollToColumn = useCallback((direction: -1 | 1) => {
    const root = scrollRef.current;
    if (!root) return;

    const cols = Array.from(root.querySelectorAll<HTMLElement>("[data-col-snap]"));
    if (cols.length === 0) return;

    const rootLeft = root.getBoundingClientRect().left;

    // Find the column whose left edge is closest to the container's left edge
    let currentIdx = 0;
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < cols.length; i++) {
      const left = cols[i].getBoundingClientRect().left - rootLeft;
      const dist = Math.abs(left);
      if (dist < best) {
        best = dist;
        currentIdx = i;
      }
    }

    const nextIdx = Math.max(0, Math.min(cols.length - 1, currentIdx + direction));
    cols[nextIdx].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName ?? "").toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (t as any)?.isContentEditable;
      if (isTyping) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollToColumn(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollToColumn(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scrollToColumn]);

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
    const projectId = projectFilter.trim();

    return {
      ...board,
      columns: board.columns.map((c) => ({
        ...c,
        cards: c.cards.filter((card) => {
          if (!showArchived && card.archived) return false;
          if (showArchived && !card.archived) return false;

          if (projectId) {
            if ((card as any).projectId !== projectId) return false;
          }

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

  useEffect(() => {
    // pick first project by default (if any)
    if (!board) return;
    if (board.projects && board.projects.length && !projectFilter) {
      setProjectFilter(board.projects[0].id);
    }
  }, [board, projectFilter]);

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
    const col = await apiCreateColumn(board.id, newColumnName.trim());
    addColumnLocal({ ...col, cards: [] });
    setNewColumnName("");
  }

  async function onCreateCard(columnId: string, title: string) {
    if (!title.trim()) return;
    const card = await apiCreateCard({ columnId, projectId: projectFilter || undefined, title: title.trim() });
    addCardLocal(card);
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
          className="h-9 w-64 rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 text-sm text-[var(--text0)] outline-none placeholder:text-[var(--text2)]"
        />


        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg1)] px-2 text-sm text-[var(--text0)]"
        >
          {(board?.projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.keyPrefix})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setCreatingProject((v) => !v)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 text-sm text-[var(--text0)] hover:bg-[var(--bg2)]"
        >
          + Project
        </button>

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg1)] px-2 text-sm text-[var(--text0)]"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-[var(--text1)]">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Archived only
        </label>

        <div className="ml-auto flex items-center gap-2">
          <input
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            placeholder="New column…"
            className="h-9 w-48 rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 text-sm text-[var(--text0)] outline-none placeholder:text-[var(--text2)]"
          />
          <button
            onClick={onCreateColumn}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm font-medium text-[var(--text0)] hover:bg-[var(--bg1)]"
          >
            Add column
          </button>
        </div>
      </div>


      {creatingProject ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg1)] p-3">
          <div className="mb-2 text-sm font-medium text-zinc-200">Create project</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Name (e.g. TaskTracker)"
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm text-[var(--text0)] outline-none"
            />
            <input
              value={newProjectPrefix}
              onChange={(e) => setNewProjectPrefix(e.target.value.toUpperCase())}
              placeholder="Key prefix (e.g. TASK)"
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm text-[var(--text0)] outline-none"
            />
            <input
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Description (optional)"
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm text-[var(--text0)] outline-none"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!board) return;
                const name = newProjectName.trim();
                const keyPrefix = newProjectPrefix.trim();
                if (!name || !keyPrefix) return;
                const proj = await apiCreateProject({ boardId: board.id, name, keyPrefix, description: newProjectDesc });
                // re-fetch board to pick up new project list
                const b = await fetchBoard();
                setBoard(b);
                setProjectFilter(proj.id);
                setNewProjectName("");
                setNewProjectPrefix("");
                setNewProjectDesc("");
                setCreatingProject(false);
              }}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm font-medium text-[var(--text0)] hover:bg-[var(--bg1)]"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreatingProject(false)}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 text-sm text-[var(--text0)] hover:bg-[var(--bg2)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center justify-end gap-2 pb-2">
          <button
            type="button"
            onClick={() => scrollToColumn(-1)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg1)] px-2 py-1 text-xs text-[var(--text0)] hover:bg-[var(--bg2)]"
            title="Previous column (←)"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollToColumn(1)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg1)] px-2 py-1 text-xs text-[var(--text0)] hover:bg-[var(--bg2)]"
            title="Next column (→)"
          >
            →
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
        >
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {filteredBoard.columns.map((col) => (
              <Column
                key={col.id}
                boardId={filteredBoard.id}
                column={col}
                onCreateCard={(title) => onCreateCard(col.id, title)}
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
