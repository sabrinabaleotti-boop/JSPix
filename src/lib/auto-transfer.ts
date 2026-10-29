import { db } from "@/lib/db";
import { createTransfer, getRecipientBalance, BALANCE_TAG } from "@/lib/pagarme";
import { getSetting } from "@/lib/settings";
import { getWithdrawFee } from "@/lib/withdraw";
import { normalizeWithdrawalStatus } from "@/lib/withdrawal-status";
import { revalidateTag } from "next/cache";
import type { SplitRule } from "@/lib/split";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tenta sacar automaticamente o saldo do recebedor responsável logo após um pagamento.
 * Espera um intervalo aleatório (1–30 s) para não parecer robótico, depois desconta
 * a tarifa de saque e mantém uma reserva mínima na conta (para detectar conta ativa).
 * Nunca lança exceção: falhas são apenas logadas.
 */
export async function tryAutoTransfer(chargeId: string) {
  try {
    if ((await getSetting("auto_transfer_enabled")) !== "true") return;

    const charge = await db.charge.findUnique({ where: { id: chargeId } });
    if (!charge || charge.status !== "paid" || charge.gateway === "simulated") return;

    const splitRules = charge.splitRules as SplitRule[] | null;
    if (!splitRules || splitRules.length === 0) return;
    const responsible = splitRules.find((r) => r.responsible);
    if (!responsible) return;

    const delaySec = Math.floor(Math.random() * 30) + 1;
    await sleep(delaySec * 1000);

    const [balance, withdrawFee] = await Promise.all([getRecipientBalance(responsible.recipientId), getWithdrawFee()]);
    const reserveCents = Number(await getSetting("auto_transfer_reserve_cents")) || 500;

    const amount = balance.available - withdrawFee - reserveCents;
    if (amount < 100) return;

    const idempotencyKey = `auto-${chargeId}-${Date.now()}`;
    const transfer = await createTransfer(responsible.recipientId, amount, idempotencyKey);
    revalidateTag(BALANCE_TAG, "max");

    await db.withdrawal
      .create({
        data: {
          clientId: null,
          recipientId: responsible.recipientId,
          recipientName: responsible.name,
          amountCents: transfer.amount,
          feeCents: transfer.fee ?? withdrawFee,
          status: normalizeWithdrawalStatus(transfer.status),
          gatewayId: transfer.id,
          fundingEstimatedDate: transfer.fundingEstimatedDate ? new Date(transfer.fundingEstimatedDate) : null,
        },
      })
      .catch((e) => console.error("[auto-transfer] registro do saque falhou:", (e as Error).message));

    console.log(
      `[auto-transfer] cobrança ${chargeId}: sacou ${amount} de ${responsible.recipientId} (saldo: ${balance.available}, tarifa: ${withdrawFee}, reserva: ${reserveCents})`,
    );
  } catch (e) {
    console.error("[auto-transfer] falhou para cobrança", chargeId, (e as Error).message);
  }
}
