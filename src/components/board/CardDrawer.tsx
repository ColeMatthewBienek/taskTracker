"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import type { BoardDTO, CardDTO } from "@/server/types";
import { fetchBoard, fetchCardActivity, setCardArchived } from "./api";
import { useBoardStore } from "./state";

export default function CardDrawer(props: { cardId: string | null; onClose: () => void }) {
  const { cardId } = props;
  const { board, setBoard } = useBoardStore();
  const [activity, setActivity] = useState<any[] | null>(null);

  const card = useMemo(() => {
    if (!board || !cardId) return null;
    for (const col of board.columns) {
      const c = col.cards.find((x) => x.id === cardId);
      if (c) return c;
    }
    return null;
  }, [board, cardId]);

  useEffect(() => {
    if (!cardId) {
      setActivity(null);
      return;
    }
    fetchCardActivity(cardId)
      .then(setActivity)
      .catch(() => setActivity([]));
  }, [cardId]);

  async function toggleArchived() {
    if (!card) return;
    await setCardArchived(card.id, !card.archived);
    const b = await fetchBoard();
    setBoard(b);
    const acts = await fetchCardActivity(card.id);
    setActivity(acts);
  }

  return (
    <Dialog.Root open={!!cardId} onOpenChange={(open) => (!open ? props.onClose() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-full max-w-xl border-l border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-semibold">
                {card?.title ?? "Card"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">
                {card ? "Card details" : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md border border-zinc-800 px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-900">
              Close
            </Dialog.Close>
          </div>

          {card ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs font-medium text-zinc-300">Description</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">
                  {card.description || <span className="text-zinc-500">(empty)</span>}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={toggleArchived}
                    className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white"
                  >
                    {card.archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs font-medium text-zinc-300">Activity</div>
                <div className="mt-2 space-y-2">
                  {activity === null ? (
                    <div className="text-xs text-zinc-500">Loading…</div>
                  ) : activity.length === 0 ? (
                    <div className="text-xs text-zinc-500">No activity yet.</div>
                  ) : (
                    activity.map((a) => (
                      <div key={a.id} className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2 py-2">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>
                            <span className="text-zinc-200">{a.actor}</span> · {a.type}
                          </span>
                          <span>{new Date(a.timestamp).toLocaleString()}</span>
                        </div>
                        {a.before ? (
                          <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-zinc-300">
{JSON.stringify(a.before, null, 2)}
                          </pre>
                        ) : null}
                        {a.after ? (
                          <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-zinc-300">
{JSON.stringify(a.after, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-sm text-zinc-400">No card selected.</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
