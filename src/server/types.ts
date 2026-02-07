import { Priority } from "@prisma/client";

export type CardTag = string;

export type ProjectDTO = {
  id: string;
  boardId: string;
  name: string;
  keyPrefix: string;
  description: string;
  nextSeq: number;
  createdAt: string;
  updatedAt: string;
};

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
  projectId: string | null;
  keyCode: string | null;
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
  projects: ProjectDTO[];
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
