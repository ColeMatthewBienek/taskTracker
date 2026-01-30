import { create } from "zustand";
import type { BoardDTO, ColumnDTO, CardDTO } from "@/server/types";

type BoardState = {
  board: BoardDTO | null;
  loading: boolean;
  error: string | null;
  selectedCardId: string | null;

  setBoard: (b: BoardDTO) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;

  selectCard: (id: string | null) => void;

  // local updates
  reorderColumnsLocal: (orderedColumnIds: string[]) => void;
  reorderCardsLocal: (columnId: string, orderedCardIds: string[]) => void;
  moveCardLocal: (cardId: string, fromColumnId: string, toColumnId: string, toIndex: number) => void;
};

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  loading: true,
  error: null,
  selectedCardId: null,

  setBoard: (b) => set({ board: b }),
  setLoading: (v) => set({ loading: v }),
  setError: (msg) => set({ error: msg }),

  selectCard: (id) => set({ selectedCardId: id }),

  reorderColumnsLocal: (orderedColumnIds) => {
    const board = get().board;
    if (!board) return;
    const byId = new Map(board.columns.map((c) => [c.id, c] as const));
    const cols = orderedColumnIds
      .map((id, idx) => {
        const c = byId.get(id);
        if (!c) return null;
        return { ...c, order: idx };
      })
      .filter(Boolean) as ColumnDTO[];
    set({ board: { ...board, columns: cols } });
  },

  reorderCardsLocal: (columnId, orderedCardIds) => {
    const board = get().board;
    if (!board) return;
    const cols = board.columns.map((c) => {
      if (c.id !== columnId) return c;
      const byId = new Map(c.cards.map((card) => [card.id, card] as const));
      const cards = orderedCardIds
        .map((id, idx) => {
          const card = byId.get(id);
          if (!card) return null;
          return { ...card, order: idx };
        })
        .filter(Boolean) as CardDTO[];
      return { ...c, cards };
    });
    set({ board: { ...board, columns: cols } });
  },

  moveCardLocal: (cardId, fromColumnId, toColumnId, toIndex) => {
    const board = get().board;
    if (!board) return;

    let moving: CardDTO | null = null;

    const cols1 = board.columns.map((c) => {
      if (c.id !== fromColumnId) return c;
      const cards = c.cards.filter((x) => {
        if (x.id === cardId) {
          moving = x;
          return false;
        }
        return true;
      });
      return { ...c, cards };
    });

    if (!moving) return;

    const cols2 = cols1.map((c) => {
      if (c.id !== toColumnId) return c;
      const cards = [...c.cards];
      cards.splice(toIndex, 0, { ...moving!, columnId: toColumnId });
      return { ...c, cards };
    });

    // normalize orders in both columns
    const cols3 = cols2.map((c) => {
      if (c.id !== fromColumnId && c.id !== toColumnId) return c;
      return {
        ...c,
        cards: c.cards.map((card, idx) => ({ ...card, order: idx })),
      };
    });

    set({ board: { ...board, columns: cols3 } });
  },
}));
