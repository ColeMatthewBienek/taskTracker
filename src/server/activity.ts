import { CardActivityType } from "@prisma/client";
import { prisma } from "./db";

export async function logActivity(params: {
  cardId: string;
  type: CardActivityType;
  actor: string;
  before?: any;
  after?: any;
}) {
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
