import { db } from "@/lib/db";
import { applyRemoteStatus } from "@/lib/charges";
import { fetchRemoteState } from "@/lib/gateway";
import { refreshPayout } from "@/lib/payouts";
import type { ChargeStatus } from "@prisma/client";

type AnyObj = Record<string, unknown>;

const get = (o: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as AnyObj)[k] : undefined), o);

/** Aplica um evento da Pagar.me à cobrança correspondente. Retorna uma descrição do que foi feito. */
export async function processPagarmeEvent(event: { id: string; type: string; data?: unknown }) {
  const type = event.type;
  const data = event.data ?? {};
  const isOrder = type.startsWith("order.");

  const orderId = (isOrder ? get(data, "id") : get(data, "order.id")) as string | undefined;
  const chargeId = (isOrder ? get(data, "charges.0.id") : get(data, "id")) as string | undefined;
  const localId = (get(data, "metadata.jpix_charge_id") ?? get(data, "order.metadata.jpix_charge_id")) as string | undefined;

  const or: { gatewayId?: string; gatewayChargeId?: string; id?: string }[] = [];
  if (orderId) or.push({ gatewayId: orderId });
  if (chargeId) or.push({ gatewayChargeId: chargeId });
  if (localId) or.push({ id: localId });
  if (or.length === 0) return "ignorado: evento sem identificação de pedido";

  const charge = await db.charge.findFirst({ where: { OR: or, gateway: { in: ["pagarme", "simulated"] } } });
  if (!charge) return "ignorado: cobrança não encontrada";

  const map: Record<string, ChargeStatus> = {
    "order.paid": "paid",
    "charge.paid": "paid",
    "order.payment_failed": "failed",
    "charge.payment_failed": "failed",
    "order.canceled": "canceled",
    "charge.canceled": "canceled",
    "charge.refunded": "refunded",
  };
  const status = map[type];
  if (!status) return `ignorado: tipo ${type}`;
  const paidAt = (get(data, "paid_at") ?? get(data, "charges.0.paid_at")) as string | undefined;
  const updated = await applyRemoteStatus(charge, status, { paidAt: paidAt ? new Date(paidAt) : undefined });
  return `cobrança ${charge.id} → ${updated.status}`;
}

/**
 * Evento da Legacy. O corpo traz só id e status; em vez de confiar nele, reconsultamos a Legacy,
 * o que impede que um evento forjado marque uma cobrança como paga.
 */
export async function processLegacyEvent(body: { id?: string; referenceId?: string | null }, eventType: string | null) {
  const id = body.id ?? "";
  if (id.startsWith("payout_") || eventType?.startsWith("payout.")) {
    const payout = await db.payout.findFirst({ where: { gatewayId: id } });
    if (!payout) return "ignorado: repasse não encontrado";
    const p = await refreshPayout(payout.id);
    return `repasse ${payout.id} → ${p.status}`;
  }

  const charge = await db.charge.findFirst({
    where: { gateway: "legacy", OR: [{ gatewayId: id }, ...(body.referenceId ? [{ id: body.referenceId }] : [])] },
  });
  if (!charge) return "ignorado: cobrança não encontrada";
  const remote = await fetchRemoteState(charge);
  if (!remote) return "ignorado: sem consulta disponível";
  const updated = await applyRemoteStatus(charge, remote.status, remote);
  return `cobrança ${charge.id} → ${updated.status}`;
}
