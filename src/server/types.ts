import { Priority } from "@prisma/client";

export type CardTag = string;

export type CardDTO = {
  id: string;
  title: string;
  description: string;
  tags: CardTag[];
  priority: Priority;
  dueDate: string | null; // ISO
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  columnId: string;
  order: number;
};

export type ColumnDTO = {
  id: string;
  name: string;
  order: number;
  wipLimit: number | null;
  boardId: string;
  cards: CardDTO[];
};

export type BoardDTO = {
  id: string;
  name: string;
  columns: ColumnDTO[];
};

export type ActivityDTO = {
  id: string;
  cardId: string;
  type: string;
  actor: string;
  timestamp: string;
  before: any;
  after: any;
};
