"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ColumnDTO } from "@/server/types";
import CardItem from "./CardItem";
import { deleteColumn, updateColumn } from "./api";
import { useBoardStore } from "./state";

export default function Column(props: {
  boardId: string;
  column: ColumnDTO;
  onCreateCard: (title: string) => void;
  onSelectCard: (id: string) => void;
}) {
  const { column } = props;
  const { updateColumnLocal, removeColumnLocal } = useBoardStore();

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editWip, setEditWip] = useState<string>(column.wipLimit ? String(column.wipLimit) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortable = useSortable({ id: `col:${column.id}` });
  const droppable = useDroppable({ id: `col:${column.id}` });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const wip = column.wipLimit ? `${column.cards.length}/${column.wipLimit}` : `${column.cards.length}`;

  async function startEdit() {
    setEditing(true);
    setMenuOpen(false);
    setError(null);
    setEditName(column.name);
    setEditWip(column.wipLimit ? String(column.wipLimit) : "");
  }

  async function saveColumnEdits() {
    const name = editName.trim();
    if (!name) {
      setError("Name required");
      return;
    }

    const wipLimit = editWip.trim() ? Number(editWip.trim()) : null;
    if (editWip.trim() && (!Number.isFinite(wipLimit) || wipLimit! <= 0)) {
      setError("WIP must be a positive number");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateColumn({ id: column.id, name, wipLimit });
      updateColumnLocal(updated);
      setEditing(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteColumn() {
    setMenuOpen(false);
    const ok = confirm(
      `Delete column "${column.name}"?\n\nThis will delete all cards in this column (and their activity).`
    );
    if (!ok) return;

    try {
      removeColumnLocal(column.id);
      await deleteColumn(column.id);
    } catch (e: any) {
      // best effort: surface error, but we'd need a refetch to truly recover
      setError(e?.message ?? "Failed to delete column");
    }
  }

  return (
    <section
      ref={(node) => {
        sortable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      style={style}
      data-col-snap
      className="w-[320px] shrink-0 snap-start rounded-lg border border-[var(--border)] bg-[var(--bg1)] flex flex-col max-h-[calc(100vh-240px)]"
    >
      <div
        className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{column.name}</div>
          <div className="text-xs text-[var(--text2)]">{wip}</div>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg1)] px-2 py-1 text-xs text-[var(--text0)] hover:bg-[var(--bg2)]"
            title="Column menu"
          >
            …
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-10 z-20 w-44 rounded-md border border-[var(--border)] bg-[var(--bg1)] p-1 shadow-xl">
              <button
                type="button"
                onClick={startEdit}
                className="w-full rounded px-2 py-1 text-left text-xs text-[var(--text0)] hover:bg-[var(--bg2)]"
              >
                Rename / WIP limit
              </button>
              <button
                type="button"
                onClick={onDeleteColumn}
                className="w-full rounded px-2 py-1 text-left text-xs text-red-300 hover:bg-[var(--bg2)]"
              >
                Delete column
              </button>
            </div>
          ) : null}

          <button
            onClick={() => {
              setCreating((v) => !v);
              setTimeout(() => {
                const el = document.getElementById(`new-card-${column.id}`) as HTMLInputElement | null;
                el?.focus();
              }, 0);
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 text-xs text-[var(--text0)] hover:bg-[var(--bg1)]"
          >
            + Card
          </button>
        </div>
      </div>

      <div className="space-y-2 p-3 flex-1 overflow-y-auto">
        {editing ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg2)] p-2">
            <div className="grid gap-2">
              <div>
                <div className="text-[11px] font-medium text-[var(--text2)]">Name</div>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm outline-none"
                />
              </div>

              <div>
                <div className="text-[11px] font-medium text-[var(--text2)]">WIP limit (optional)</div>
                <input
                  value={editWip}
                  onChange={(e) => setEditWip(e.target.value)}
                  inputMode="numeric"
                  className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm outline-none"
                  placeholder="e.g. 5"
                />
              </div>

              {error ? <div className="text-xs text-red-400">{error}</div> : null}

              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                  }}
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text0)] hover:bg-[var(--bg2)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveColumnEdits}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 text-xs font-medium text-[var(--text0)] hover:bg-[var(--bg1)] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {creating ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = newTitle.trim();
              if (!t) return;
              props.onCreateCard(t);
              setNewTitle("");
              setCreating(false);
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--bg2)] p-2"
          >
            <input
              id={`new-card-${column.id}`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Card title…"
              className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm outline-none placeholder:text-[var(--text0)]0"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewTitle("");
                }}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--text0)] hover:bg-[var(--bg2)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 text-xs font-medium text-[var(--text0)] hover:bg-[var(--bg1)]"
              >
                Create
              </button>
            </div>
          </form>
        ) : null}

        {column.cards.map((card) => (
          <CardItem key={card.id} card={card} onClick={() => props.onSelectCard(card.id)} />
        ))}
        {column.cards.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-[var(--text0)]0">
            Drop cards here
          </div>
        ) : null}
      </div>
    </section>
  );
}
