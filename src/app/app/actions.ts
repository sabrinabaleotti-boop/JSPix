"use server";

import { getClientId } from "@/lib/auth";
import { db } from "@/lib/db";
import { withdraw, type WithdrawState } from "@/lib/withdraw";

export async function clientWithdrawAction(recipientId: string, amountCents: number, idempotencyKey: string): Promise<WithdrawState> {
  const clientId = await getClientId();
  const client = clientId ? await db.client.findUnique({ where: { id: clientId }, select: { active: true } }) : null;
  if (!client?.active) return { error: "Sessão expirada. Entre de novo com o seu código." };
  return withdraw(recipientId, amountCents, idempotencyKey);
}
