import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  // wipe existing
  await prisma.cardActivity.deleteMany();
  await prisma.card.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();

  const board = await prisma.board.create({
    data: {
      name: "Personal Taskboard",
      columns: {
        create: [
          { name: "Backlog", order: 0 },
          { name: "In Progress", order: 1, wipLimit: 5 },
          { name: "Done", order: 2 },
        ],
      },
    },
    include: { columns: true },
  });

  const byName = Object.fromEntries(board.columns.map((c) => [c.name, c]));

  const cards = [
    {
      columnId: byName["Backlog"].id,
      order: 0,
      title: "Set up TaskTracker MVP",
      description: "Next.js + Prisma + SQLite + drag/drop + activity log",
      tags: ["jarvis", "mvp"],
      priority: "HIGH",
    },
    {
      columnId: byName["Backlog"].id,
      order: 1,
      title: "Add JSON export/import",
      description: "Simple backup + restore for the whole DB",
      tags: ["backup"],
      priority: "MEDIUM",
    },
    {
      columnId: byName["In Progress"].id,
      order: 0,
      title: "Make columns reorderable",
      description: "Persist column order in DB",
      tags: ["ui"],
      priority: "MEDIUM",
    },
    {
      columnId: byName["Done"].id,
      order: 0,
      title: "Seed example board",
      description: "You are looking at it.",
      tags: ["seed"],
      priority: "LOW",
    },
  ];

  for (const c of cards) {
    const created = await prisma.card.create({
      data: {
        columnId: c.columnId,
        order: c.order,
        title: c.title,
        description: c.description,
        tags: c.tags,
        priority: c.priority,
        archived: false,
      },
    });

    await prisma.cardActivity.create({
      data: {
        cardId: created.id,
        type: "CREATED",
        actor: "Cole",
        before: null,
        after: {
          title: created.title,
          description: created.description,
          tags: created.tags,
          priority: created.priority,
          columnId: created.columnId,
          archived: created.archived,
        },
      },
    });
  }

  console.log("Seeded board:", board.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
