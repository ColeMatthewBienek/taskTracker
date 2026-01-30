"use client";

export default function CardOverlay({ id }: { id: string }) {
  // Keep overlay minimal; we mainly want feedback while dragging.
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 shadow-xl">
      {id.startsWith("col:") ? "Column" : "Card"}
    </div>
  );
}
