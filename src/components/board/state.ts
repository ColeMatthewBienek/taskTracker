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
  addColumnLocal: (col: Omit<ColumnDTO, "cards"> & { cards?: CardDTO[] }) => void;
  addCardLocal: (card: CardDTO) => void;
  upsertCardLocal: (card: Partial<CardDTO> & { id: string }) => void;

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

  addColumnLocal: (col) => {
    const board = get().board;
    if (!board) return;
    const exists = board.columns.some((c) => c.id === col.id);
    if (exists) return;

    const next: ColumnDTO = {
      ...(col as any),
      cards: col.cards ?? [],
    };

    const cols = [...board.columns, next].sort((a, b) => a.order - b.order);
    set({ board: { ...board, columns: cols } });
  },

  addCardLocal: (card) => {
    const board = get().board;
    if (!board) return;

    const cols = board.columns.map((c) => {
      if (c.id !== card.columnId) return c;
      const exists = c.cards.some((x) => x.id === card.id);
      if (exists) return c;
      const cards = [...c.cards, card].sort((a, b) => a.order - b.order);
      return { ...c, cards };
    });

    set({ board: { ...board, columns: cols } });
  },

  upsertCardLocal: (patch) => {
    const board = get().board;
    if (!board) return;

    let found = false;
    let movedFrom: string | null = null;

    const cols1 = board.columns.map((c) => {
      const idx = c.cards.findIndex((x) => x.id === patch.id);
      if (idx === -1) return c;
      found = true;

      const current = c.cards[idx];
      const next = { ...current, ...patch } as CardDTO;

      // if columnId changes, remove from old column and insert later
      if (next.columnId !== c.id) {
        movedFrom = c.id;
        const cards = c.cards.filter((x) => x.id !== patch.id);
        return { ...c, cards };
      }

      const cards = c.cards.slice();
      cards[idx] = next;
      return { ...c, cards: cards.sort((a, b) => a.order - b.order) };
    });

    let cols2 = cols1;
    if (found) {
      // If it moved columns, insert into the new one
      const toColumnId = (patch as any).columnId as string | undefined;
      if (toColumnId && toColumnId !== movedFrom) {
        cols2 = cols1.map((c) => {
          if (c.id !== toColumnId) return c;
          const current = c.cards.find((x) => x.id === patch.id);
          if (current) return c;
          // best-effort: patch might be partial, but should include enough for display
          const next = patch as any as CardDTO;
          return { ...c, cards: [...c.cards, next].sort((a, b) => a.order - b.order) };
        });
      }
    }

    set({ board: { ...board, columns: cols2 } });
  },

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
