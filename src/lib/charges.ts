import { db } from "@/lib/db";
import { fetchRemoteState } from "@/lib/gateway";
import { getSetting } from "@/lib/settings";
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
  return db.charge.update({ where: { id: chargeId }, data: { status: "paid", paidAt, ourFeeCents, gatewayFeeCents: c.gateway === "simulated" ? 0 : fee } });
}

export function serializeCharge(c: Charge) {
  const fee = c.ourFeeCents || computeOurFee(c.amountCents, Number(c.feePercent), c.feeFixedCents);
  return {
    id: c.id,
    amountCents: c.amountCents,
    netCents: c.amountCents - fee,
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
