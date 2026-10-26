import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { COUNTED_PAYOUT_STATUSES } from "@/lib/payouts";

export const PERIODS = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  mes: "Este mês",
  "mes-anterior": "Mês anterior",
  tudo: "Todo o período",
} as const;
export type PeriodKey = keyof typeof PERIODS;

export function periodRange(key: string | undefined) {
  const k: PeriodKey = key && key in PERIODS ? (key as PeriodKey) : "30d";
  const now = new Date();
  let from: Date | undefined;
  let to: Date | undefined;
  if (k === "7d") from = new Date(now.getTime() - 7 * 86400000);
  if (k === "30d") from = new Date(now.getTime() - 30 * 86400000);
  if (k === "mes") from = new Date(now.getFullYear(), now.getMonth(), 1);
  if (k === "mes-anterior") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { key: k, label: PERIODS[k], from, to };
}

export type FinanceRow = {
  clientId: string;
  name: string;
  accessCode: string;
  payoutPixKey: string | null;
  payoutPixKeyType: string | null;
  /** No período */
  paidCount: number;
  grossCents: number;
  ourFeeCents: number;
  gatewayFeeCents: number;
  profitCents: number;
  clientNetCents: number;
  paidOutCents: number;
  /** Desde sempre: o que o cliente tem a receber menos o que já foi repassado */
  balanceCents: number;
};

/**
 * Números do financeiro por cliente.
 * - Valores do período: pelas cobranças pagas dentro do período (data do pagamento) e repasses feitos nele.
 * - Saldo a repassar: sempre acumulado, independente do período.
 */
export async function financeByClient(range: { from?: Date; to?: Date }) {
  const paidAtFilter = range.from || range.to ? { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lt: range.to } : {}) } : undefined;
  const gwPercent = Number(await getSetting("gateway_fee_percent"));

  const [clients, paidInPeriod, paidAll, payoutsAll, payoutsPeriod] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, accessCode: true, payoutPixKey: true, payoutPixKeyType: true } }),
    db.charge.findMany({
      where: { status: "paid", ...(paidAtFilter ? { paidAt: paidAtFilter } : {}) },
      select: { clientId: true, amountCents: true, ourFeeCents: true, gatewayFeeCents: true, gateway: true },
    }),
    db.charge.groupBy({ by: ["clientId"], where: { status: "paid" }, _sum: { amountCents: true, ourFeeCents: true } }),
    db.payout.groupBy({ by: ["clientId"], where: { status: { in: COUNTED_PAYOUT_STATUSES } }, _sum: { amountCents: true } }),
    db.payout.groupBy({
      by: ["clientId"],
      where: { status: { in: COUNTED_PAYOUT_STATUSES }, ...(paidAtFilter ? { paidAt: paidAtFilter } : {}) },
      _sum: { amountCents: true },
    }),
  ]);

  const rows: FinanceRow[] = clients.map((c) => {
    const mine = paidInPeriod.filter((p) => p.clientId === c.id);
    const gross = mine.reduce((s, p) => s + p.amountCents, 0);
    const ourFee = mine.reduce((s, p) => s + p.ourFeeCents, 0);
    const gwFee = mine.reduce(
      (s, p) => s + (p.gateway === "simulated" ? 0 : (p.gatewayFeeCents ?? Math.round((p.amountCents * gwPercent) / 100))),
      0,
    );
    const all = paidAll.find((p) => p.clientId === c.id)?._sum;
    const outAll = payoutsAll.find((p) => p.clientId === c.id)?._sum.amountCents ?? 0;
    return {
      clientId: c.id,
      name: c.name,
      accessCode: c.accessCode,
      payoutPixKey: c.payoutPixKey,
      payoutPixKeyType: c.payoutPixKeyType,
      paidCount: mine.length,
      grossCents: gross,
      ourFeeCents: ourFee,
      gatewayFeeCents: gwFee,
      profitCents: ourFee - gwFee,
      clientNetCents: gross - ourFee,
      paidOutCents: payoutsPeriod.find((p) => p.clientId === c.id)?._sum.amountCents ?? 0,
      balanceCents: (all?.amountCents ?? 0) - (all?.ourFeeCents ?? 0) - outAll,
    };
  });

  const sum = (k: keyof FinanceRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const totals = {
    paidCount: sum("paidCount"),
    grossCents: sum("grossCents"),
    ourFeeCents: sum("ourFeeCents"),
    gatewayFeeCents: sum("gatewayFeeCents"),
    profitCents: sum("profitCents"),
    clientNetCents: sum("clientNetCents"),
    paidOutCents: sum("paidOutCents"),
    balanceCents: sum("balanceCents"),
  };
  return { rows, totals };
}

export async function clientBalance(clientId: string) {
  const [paid, out] = await Promise.all([
    db.charge.aggregate({ where: { clientId, status: "paid" }, _sum: { amountCents: true, ourFeeCents: true } }),
    db.payout.aggregate({ where: { clientId, status: { in: COUNTED_PAYOUT_STATUSES } }, _sum: { amountCents: true } }),
  ]);
  return (paid._sum.amountCents ?? 0) - (paid._sum.ourFeeCents ?? 0) - (out._sum.amountCents ?? 0);
}
