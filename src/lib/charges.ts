import { db } from "@/lib/db";
import { fetchRemoteState } from "@/lib/gateway";
import { getSetting } from "@/lib/settings";
import { notifyChargePaid } from "@/lib/push";
import type { Charge, ChargeStatus } from "@prisma/client";

export function computeOurFee(amountCents: number, feePercent: number, feeFixedCents: number) {
  return Math.round((amountCents * feePercent) / 100) + feeFixedCents;
}

/** Aplica um status vindo da gateway. Pagamento confirmado sempre vence (o dinheiro entrou). */
export async function applyRemoteStatus(charge: Charge, status: ChargeStatus, extra: { paidAt?: Date; gatewayFeeCents?: number | null } = {}) {
  if (status === "paid") return markPaid(charge.id, extra.paidAt ?? new Date(), extra.gatewayFeeCents);
  if (status === charge.status) return charge;
  if (charge.status === "paid" && status !== "refunded") return charge;
  if (status === "pending") return charge;
  return db.charge.update({ where: { id: charge.id }, data: { status } });
}

/** Reconsulta pendentes na gateway e marca como expiradas as que passaram do prazo local. */
export async function reconcileCharge(charge: Charge): Promise<Charge> {
  if (charge.status !== "pending") return charge;
  try {
    const remote = await fetchRemoteState(charge);
    if (remote && remote.status !== "pending") return applyRemoteStatus(charge, remote.status, remote);
  } catch {
    // mantém como está; webhook ou próxima consulta resolve
  }
  if (charge.expiresAt.getTime() < Date.now()) {
    return db.charge.update({ where: { id: charge.id }, data: { status: "expired" } });
  }
  return charge;
}

export async function markPaid(chargeId: string, paidAt: Date, gatewayFeeCents?: number | null) {
  const c = await db.charge.findUniqueOrThrow({ where: { id: chargeId } });
  if (c.status === "paid") {
    if (gatewayFeeCents != null && c.gatewayFeeCents == null) return db.charge.update({ where: { id: chargeId }, data: { gatewayFeeCents } });
    return c;
  }
  const ourFeeCents = computeOurFee(c.amountCents, Number(c.feePercent), c.feeFixedCents);
  // Custo da gateway: o informado por ela ou, na falta, a estimativa configurada no admin, congelada aqui.
  const fee = gatewayFeeCents ?? Math.round((c.amountCents * Number(await getSetting("gateway_fee_percent"))) / 100);
  const paid = await db.charge.update({ where: { id: chargeId }, data: { status: "paid", paidAt, ourFeeCents, gatewayFeeCents: c.gateway === "simulated" ? 0 : fee } });
  await notifyChargePaid(chargeId);
  return paid;
}

/** Custo da Pagar.me na cobrança: o informado por ela ou, na falta, a estimativa pela taxa configurada. */
export function gatewayFeeOf(c: Pick<Charge, "amountCents" | "gatewayFeeCents">, gatewayPercent: number) {
  return c.gatewayFeeCents ?? Math.round((c.amountCents * gatewayPercent) / 100);
}

export function serializeCharge(c: Charge) {
  const gatewayFeeCents = c.gatewayFeeCents ?? 0;
  return {
    id: c.id,
    amountCents: c.amountCents,
    gatewayFeeCents,
    netCents: c.amountCents - gatewayFeeCents,
    description: c.description,
    payerName: c.payerName,
    payerCpf: c.payerCpf,
    status: c.status,
    qrCode: c.qrCode,
    qrCodeUrl: c.qrCodeUrl,
    expiresAt: c.expiresAt.toISOString(),
    paidAt: c.paidAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    feePercent: Number(c.feePercent),
    ourFeeCents: c.ourFeeCents,
    simulated: c.gateway === "simulated",
  };
}

export type ChargeDTO = ReturnType<typeof serializeCharge>;

export function periodBounds(days: number) {
  const now = Date.now();
  return { since: new Date(now - days * 86400000), prevSince: new Date(now - 2 * days * 86400000) };
}

/** Converte a chave do seletor de período em datas. */
export function periodFromParam(key: string | null | undefined): { since: Date; prevSince: Date; label: string; days: number } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = (d: number) => d * 86400000;

  switch (key) {
    case "hoje":
      return { since: startOfDay, prevSince: new Date(startOfDay.getTime() - ms(1)), label: "Hoje", days: 1 };
    case "ontem": {
      const yesterday = new Date(startOfDay.getTime() - ms(1));
      return { since: yesterday, prevSince: new Date(yesterday.getTime() - ms(1)), label: "Ontem", days: 1 };
    }
    case "30d":
      return { since: new Date(now.getTime() - ms(30)), prevSince: new Date(now.getTime() - ms(60)), label: "Últimos 30 dias", days: 30 };
    case "6m":
      return { since: new Date(now.getTime() - ms(180)), prevSince: new Date(now.getTime() - ms(360)), label: "Últimos 6 meses", days: 180 };
    case "1a":
      return { since: new Date(now.getTime() - ms(365)), prevSince: new Date(now.getTime() - ms(730)), label: "Último ano", days: 365 };
    case "tudo":
      return { since: new Date(0), prevSince: new Date(0), label: "Todo o período", days: 0 };
    default:
      return { since: new Date(now.getTime() - ms(7)), prevSince: new Date(now.getTime() - ms(14)), label: "Últimos 7 dias", days: 7 };
  }
}
