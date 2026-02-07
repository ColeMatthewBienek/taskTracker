-- sqlite migration: add Projects + per-card keyCodes

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "boardId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "nextSeq" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Project_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Project_boardId_name_idx" ON "Project"("boardId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_boardId_keyPrefix_key" ON "Project"("boardId", "keyPrefix");

ALTER TABLE "Card" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Card" ADD COLUMN "keyCode" TEXT;

CREATE INDEX IF NOT EXISTS "Card_projectId_archived_order_idx" ON "Card"("projectId", "archived", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "Card_projectId_keyCode_key" ON "Card"("projectId", "keyCode");
