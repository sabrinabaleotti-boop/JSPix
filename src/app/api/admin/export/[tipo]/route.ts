import { NextResponse } from "next/server";
import type { ChargeStatus, Prisma } from "@prisma/client";
import { getAdminId } from "@/lib/auth";
import { db } from "@/lib/db";
import { financeByClient, periodRange } from "@/lib/finance";
import { centsCell, csvResponse, toCsv } from "@/lib/csv";
import { PAYOUT_STATUS_LABEL } from "@/lib/payouts";

const STATUS_PT: Record<ChargeStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  expired: "Expirado",
  canceled: "Cancelado",
  failed: "Falhou",
  refunded: "Estornado",
};

export async function GET(req: Request, ctx: { params: Promise<{ tipo: string }> }) {
  const adminId = await getAdminId();
  if (!adminId || !(await db.admin.findUnique({ where: { id: adminId } }))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { tipo } = await ctx.params;
  const url = new URL(req.url);
  const stamp = new Date().toISOString().slice(0, 10);

  if (tipo === "financeiro") {
    const range = periodRange(url.searchParams.get("periodo") ?? undefined);
    const { rows, totals } = await financeByClient(range);
    const body = toCsv(
      ["Cliente", "Código", "Pagamentos", "Bruto", "Sua taxa", "Custo gateway", "Lucro", "Líquido cliente", "Repassado no período", "Saldo a repassar", "Chave Pix"],
      [
        ...rows.map((r) => [
          r.name,
          r.accessCode,
          r.paidCount,
          centsCell(r.grossCents),
          centsCell(r.ourFeeCents),
          centsCell(r.gatewayFeeCents),
          centsCell(r.profitCents),
          centsCell(r.clientNetCents),
          centsCell(r.paidOutCents),
          centsCell(r.balanceCents),
          r.payoutPixKey,
        ]),
        [
          "TOTAL",
          "",
          totals.paidCount,
          centsCell(totals.grossCents),
          centsCell(totals.ourFeeCents),
          centsCell(totals.gatewayFeeCents),
          centsCell(totals.profitCents),
          centsCell(totals.clientNetCents),
          centsCell(totals.paidOutCents),
          centsCell(totals.balanceCents),
          "",
        ],
      ],
    );
    return csvResponse(`jpix-financeiro-${range.key}-${stamp}.csv`, body);
  }

  if (tipo === "repasses") {
    const payouts = await db.payout.findMany({ orderBy: { paidAt: "desc" }, include: { client: { select: { name: true } } } });
    const body = toCsv(
      ["Data", "Cliente", "Valor", "Forma", "Status", "Chave Pix", "ID na gateway", "Observação", "Comprovante", "Motivo da falha"],
      payouts.map((p) => [
        p.paidAt,
        p.client.name,
        centsCell(p.amountCents),
        p.method === "legacy" ? "Pix Legacy" : "Manual",
        PAYOUT_STATUS_LABEL[p.status]?.label ?? p.status,
        p.pixKey,
        p.gatewayId,
        p.note,
        p.receiptUrl,
        p.failureReason,
      ]),
    );
    return csvResponse(`jpix-repasses-${stamp}.csv`, body);
  }

  if (tipo === "cobrancas") {
    const cliente = url.searchParams.get("cliente");
    const status = url.searchParams.get("status") as ChargeStatus | null;
    const where: Prisma.ChargeWhereInput = {
      ...(cliente ? { clientId: cliente } : {}),
      ...(status && status in STATUS_PT ? { status } : {}),
    };
    const charges = await db.charge.findMany({ where, orderBy: { createdAt: "desc" }, take: 10000, include: { client: { select: { name: true } } } });
    const body = toCsv(
      ["Criada em", "Pago em", "Cliente", "Descrição", "Pagador", "CPF", "Valor", "Status", "Gateway", "Taxa %", "Sua taxa", "Custo gateway", "ID na gateway"],
      charges.map((c) => [
        c.createdAt,
        c.paidAt,
        c.client.name,
        c.description,
        c.payerName,
        c.payerCpf,
        centsCell(c.amountCents),
        STATUS_PT[c.status],
        c.gateway,
        Number(c.feePercent).toFixed(2).replace(".", ","),
        c.status === "paid" ? centsCell(c.ourFeeCents) : "",
        centsCell(c.gatewayFeeCents),
        c.gatewayId,
      ]),
    );
    return csvResponse(`jpix-cobrancas-${stamp}.csv`, body);
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 404 });
}
