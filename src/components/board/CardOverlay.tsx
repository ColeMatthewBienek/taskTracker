"use client";

export default function CardOverlay({ id }: { id: string }) {
  // Keep overlay minimal; we mainly want feedback while dragging.
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 py-2 text-sm text-[var(--text0)] shadow-xl">
      {id.startsWith("col:") ? "Column" : "Card"}
    </div>
  );
}
