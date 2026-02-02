import { CardActivityType, PrismaClient } from "@prisma/client";

export async function logActivity(
  prisma: PrismaClient,
  params: {
    cardId: string;
    type: CardActivityType;
    actor: string;
    before?: any;
    after?: any;
  }
) {
  const { cardId, type, actor, before, after } = params;
  return prisma.cardActivity.create({
    data: {
      cardId,
      type,
      actor,
      before: before ?? null,
      after: after ?? null,
    },
  });
}
