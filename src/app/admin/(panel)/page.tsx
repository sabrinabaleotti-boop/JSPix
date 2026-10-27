import { COUNTED_PAYOUT_STATUSES } from "@/lib/payouts";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { ArrowRight, Clock, DollarSign, Percent, Wallet } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { PageHeader, Td, Th } from "@/components/admin/page-header";
import { statusMeta } from "@/components/charge-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { periodBounds } from "@/lib/charges";
import { cn, formatBRL } from "@/lib/utils";
import { syncExpiredCharges } from "@/lib/expiry-sync";
import { reconcilePendingCharges } from "@/lib/reconcile";

export const metadata = { title: "Admin" };

const medal = ["gradient-primary text-white shadow-primary", "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100", "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"];

export default async function AdminHome() {
  await requireAdmin();
  const { since } = periodBounds(30);
  await Promise.all([syncExpiredCharges(), reconcilePendingCharges()]);

  const [paid30, paidAll, payouts, pendingNow, top, recent] = await Promise.all([
    db.charge.aggregate({ where: { status: "paid", paidAt: { gte: since } }, _sum: { amountCents: true, ourFeeCents: true }, _count: true }),
    db.charge.aggregate({ where: { status: "paid" }, _sum: { amountCents: true, ourFeeCents: true } }),
    db.payout.aggregate({ where: { status: { in: COUNTED_PAYOUT_STATUSES } }, _sum: { amountCents: true } }),
    db.charge.count({ where: { status: "pending" } }),
    db.charge.groupBy({
      by: ["clientId"],
      where: { status: "paid", paidAt: { gte: since } },
      _sum: { amountCents: true },
      _count: true,
      orderBy: { _sum: { amountCents: "desc" } },
      take: 5,
    }),
    db.charge.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { client: { select: { name: true } } } }),
  ]);

  const clients = await db.client.findMany({ where: { id: { in: top.map((t) => t.clientId) } }, select: { id: true, name: true } });
  const nameOf = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const gross30 = paid30._sum.amountCents ?? 0;
  const revenue30 = paid30._sum.ourFeeCents ?? 0;
  const toTransfer = (paidAll._sum.amountCents ?? 0) - (paidAll._sum.ourFeeCents ?? 0) - (payouts._sum.amountCents ?? 0);
  const topMax = Math.max(1, ...top.map((t) => t._sum.amountCents ?? 0));

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader eyebrow="Administração" title="Visão geral" description="Volume, receita e repasses. Valores pagos nos últimos 30 dias." />

      <div className="stagger space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Volume pago" subtitle={`${paid30._count} pagamento${paid30._count === 1 ? "" : "s"} em 30 dias`} cents={gross30} icon={DollarSign} highlight />
          <StatCard title="Sua receita" subtitle="Taxas cobradas em 30 dias" cents={revenue30} icon={Percent} />
          <StatCard title="A repassar" subtitle="Líquido dos clientes menos repasses" cents={toTransfer} icon={Wallet} />
          <StatCard title="Pendentes agora" subtitle="Pix aguardando pagamento" count={pendingNow} icon={Clock} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Top clientes</CardTitle>
                <CardDescription>Por volume pago em 30 dias.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {top.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pagamento no período.</p>
              ) : (
                <ul className="space-y-3">
                  {top.map((t, i) => {
                    const v = t._sum.amountCents ?? 0;
                    return (
                      <li key={t.clientId}>
                        <div className="flex items-center gap-3">
                          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold", medal[i] ?? "bg-muted text-muted-foreground")}>{i + 1}</span>
                          <Link href={`/admin/clientes/${t.clientId}`} className="flex-1 truncate text-sm font-semibold hover:underline">
                            {nameOf(t.clientId)}
                          </Link>
                          <span className="text-xs text-muted-foreground">{t._count}×</span>
                          <span className="text-sm font-bold tabular">{formatBRL(v)}</span>
                        </div>
                        <div className="ml-11 mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full origin-left rounded-full gradient-primary animate-grow-x" style={{ width: `${(v / topMax) * 100}%`, animationDelay: `${150 + i * 80}ms` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <div>
                <CardTitle>Últimas cobranças</CardTitle>
                <CardDescription>De todos os clientes.</CardDescription>
              </div>
              <Link href="/admin/cobrancas" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full">
                <thead className="border-y bg-muted/40">
                  <tr>
                    <Th>Data</Th>
                    <Th>Cliente</Th>
                    <Th className="text-right">Valor</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recent.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-accent/40">
                      <Td className="text-muted-foreground">{c.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</Td>
                      <Td className="font-medium">{c.client.name}</Td>
                      <Td className="text-right font-bold tabular">{formatBRL(c.amountCents)}</Td>
                      <Td>
                        <Badge variant={statusMeta[c.status].variant} dot pulse={c.status === "pending"}>
                          {statusMeta[c.status].label}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <Td className="py-8 text-center text-muted-foreground">Nenhuma cobrança ainda.</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
