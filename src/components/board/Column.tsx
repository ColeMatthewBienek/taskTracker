"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ColumnDTO } from "@/server/types";
import CardItem from "./CardItem";

export default function Column(props: {
  boardId: string;
  column: ColumnDTO;
  onCreateCard: (title: string) => void;
  onSelectCard: (id: string) => void;
}) {
  const { column } = props;
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const sortable = useSortable({ id: `col:${column.id}` });
  const droppable = useDroppable({ id: `col:${column.id}` });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const wip = column.wipLimit ? `${column.cards.length}/${column.wipLimit}` : `${column.cards.length}`;

  return (
    <section
      ref={(node) => {
        sortable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      style={style}
      className="w-[320px] shrink-0 rounded-lg border border-zinc-800 bg-zinc-900/40"
    >
      <div
        className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2"
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{column.name}</div>
          <div className="text-xs text-zinc-400">{wip}</div>
        </div>

        <button
          onClick={() => {
            setCreating((v) => !v);
            setTimeout(() => {
              const el = document.getElementById(`new-card-${column.id}`) as HTMLInputElement | null;
              el?.focus();
            }, 0);
          }}
          className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
        >
          + Card
        </button>
      </div>

      <div className="space-y-2 p-3">
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
            className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2"
          >
            <input
              id={`new-card-${column.id}`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Card title…"
              className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none placeholder:text-zinc-500"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewTitle("");
                }}
                className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-white"
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
          <div className="rounded-md border border-dashed border-zinc-800 px-3 py-6 text-center text-xs text-zinc-500">
            Drop cards here
          </div>
        ) : null}
      </div>
    </section>
  );
}
