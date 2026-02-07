"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CardDTO } from "@/server/types";

function priorityColor(p: CardDTO["priority"]) {
  switch (p) {
    case "URGENT":
      return "bg-red-500";
    case "HIGH":
      return "bg-orange-500";
    case "MEDIUM":
      return "bg-yellow-500";
    case "LOW":
      return "bg-emerald-500";
    default:
      return "bg-zinc-500";
  }
}

export default function CardItem({ card, onClick }: { card: CardDTO; onClick: () => void }) {
  const sortable = useSortable({ id: `card:${card.id}` });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  const due = card.dueDate ? new Date(card.dueDate) : null;
  const overdue = due ? due.getTime() < Date.now() && !card.archived : false;
  const dueLabel = due
    ? due.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
      onClick={onClick}
      className="group cursor-pointer rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2 hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-zinc-100">
            {card.keyCode ? <span className="mr-2 text-zinc-400">[{card.keyCode}]</span> : null}
            {card.title}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            {card.archived ? (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">ARCHIVED</span>
            ) : null}

            {dueLabel ? (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  overdue ? "bg-red-500/20 text-red-200" : "bg-zinc-800 text-zinc-200"
                }`}
              >
                Due {dueLabel}
              </span>
            ) : null}
          </div>

          {card.description ? (
            <div className="mt-1 line-clamp-2 text-xs text-zinc-400">{card.description}</div>
          ) : null}
        </div>
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityColor(card.priority)}`} />
      </div>

      {(card.tags?.length ?? 0) > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-200">
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
