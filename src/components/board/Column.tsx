"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ColumnDTO } from "@/server/types";
import CardItem from "./CardItem";

export default function Column(props: {
  boardId: string;
  column: ColumnDTO;
  onCreateCard: () => void;
  onSelectCard: (id: string) => void;
}) {
  const { column } = props;

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
          onClick={props.onCreateCard}
          className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
        >
          + Card
        </button>
      </div>

      <div className="space-y-2 p-3">
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
