import { redirect } from "next/navigation";
import { ArrowRight, Banknote, Calendar, DollarSign, Percent, QrCode, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { ChargeList } from "@/components/charge-list";
import { CountUp } from "@/components/count-up";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/stat-card";
import { WithdrawalHistory } from "@/components/withdrawal-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientId } from "@/lib/auth";
import { gatewayFeeOf, periodBounds, serializeCharge } from "@/lib/charges";
import { db } from "@/lib/db";
import { serializeWithdrawal, withdrawalScope } from "@/lib/withdraw";
import { formatBRL } from "@/lib/utils";
import { getSetting } from "@/lib/settings";

const COUNTED_WITHDRAWALS = { notIn: ["failed", "canceled"] };

export default async function AppHome() {
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const { since, prevSince } = periodBounds(7);

  // expira pendentes vencidas antes de contar
  await db.charge.updateMany({ where: { clientId, status: "pending", expiresAt: { lt: new Date() } }, data: { status: "expired" } });

  const [period, prev, paidAll, recent, client, withdrawals, withdrawnAll, withdrawn7d, gwPercent] = await Promise.all([
    db.charge.findMany({ where: { clientId, createdAt: { gte: since } } }),
    db.charge.findMany({ where: { clientId, createdAt: { gte: prevSince, lt: since }, status: "paid" } }),
    db.charge.findMany({ where: { clientId, status: "paid" }, select: { amountCents: true, gatewayFeeCents: true } }),
    db.charge.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.client.findUnique({ where: { id: clientId }, select: { name: true } }),
    db.withdrawal.findMany({ where: withdrawalScope(clientId), orderBy: { createdAt: "desc" }, take: 3, include: { client: { select: { name: true } } } }),
    db.withdrawal.aggregate({ where: { ...withdrawalScope(clientId), status: COUNTED_WITHDRAWALS }, _sum: { amountCents: true } }),
    db.withdrawal.aggregate({ where: { ...withdrawalScope(clientId), status: COUNTED_WITHDRAWALS, createdAt: { gte: since } }, _sum: { amountCents: true } }),
    getSetting("gateway_fee_percent"),
  ]);

  const gw = Number(gwPercent) || 0;
  const gwLabel = `${gw.toFixed(2).replace(".", ",")}%`;
  const firstName = client?.name.split(/\s+/)[0] ?? "";

  // Totais de sempre: o que entrou de fato na conta é o pago menos a taxa da Pagar.me.
  const grossAll = paidAll.reduce((s, c) => s + c.amountCents, 0);
  const gwFeeAll = paidAll.reduce((s, c) => s + gatewayFeeOf(c, gw), 0);
  const netAll = grossAll - gwFeeAll;
  const sacadoAll = withdrawnAll._sum.amountCents ?? 0;

  // Últimos 7 dias
  const paid = period.filter((c) => c.status === "paid");
  const gross = paid.reduce((s, c) => s + c.amountCents, 0);
  const gwFee = paid.reduce((s, c) => s + gatewayFeeOf(c, gw), 0);
  const prevGross = prev.reduce((s, c) => s + c.amountCents, 0);
  const delta = prevGross > 0 ? ((gross - prevGross) / prevGross) * 100 : gross > 0 ? 100 : 0;
  const sacado7d = withdrawn7d._sum.amountCents ?? 0;

  const count = (s: string) => period.filter((c) => c.status === s).length;
  const dist = [
    { label: "Pagas", n: count("paid"), color: "bg-success" },
    { label: "Pendentes", n: count("pending"), color: "bg-warning" },
    { label: "Expiradas", n: count("expired"), color: "bg-muted-foreground/50" },
    { label: "Canceladas / falhas", n: count("canceled") + count("failed"), color: "bg-destructive" },
  ];
  const ticket = paid.length ? Math.round(gross / paid.length) : 0;
  const conv = period.length ? Math.round((paid.length / period.length) * 100) : 0;
  const pendingNow = recent.filter((c) => c.status === "pending").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader eyebrow="Painel" title={firstName ? `Olá, ${firstName}` : "Visão geral"} description="Acompanhe cobranças, pagamentos e saques dos últimos 7 dias.">
        <Link href="/app/gerar" className="hidden sm:block">
          <Button className="h-10">
            <QrCode className="h-4 w-4" /> Gerar Pix
          </Button>
        </Link>
      </PageHeader>

      <div className="stagger space-y-5">
        <Card className="mesh shine relative overflow-hidden border-transparent text-white gradient-hero shadow-[0_24px_50px_-20px_rgb(29_78_216/0.65)]">
          <CardContent className="relative p-6 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/18 ring-1 ring-white/25">
                    <Wallet className="h-4 w-4" />
                  </span>
                  Saldo recebido
                </p>
                <p className="mt-3 text-[40px] font-bold leading-none tracking-tight tabular drop-shadow-sm sm:text-[46px]">
                  <CountUp value={netAll} format="brl" duration={1100} />
                </p>
                <p className="mt-2 text-xs text-white/75">
                  {formatBRL(grossAll)} em Pix pagos · taxa Pagar.me ({gwLabel}) − {formatBRL(gwFeeAll)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href="/app/gerar" className="flex-1 sm:flex-none">
                  <Button variant="white" className="w-full whitespace-nowrap sm:px-5">
                    <QrCode className="h-4 w-4" /> Gerar Pix
                  </Button>
                </Link>
                <Link href="/app/saque" className="flex-1 sm:flex-none">
                  <Button className="w-full whitespace-nowrap border border-white/30 bg-white/12 text-white shadow-none backdrop-blur hover:bg-white/20 hover:brightness-100 sm:px-5" style={{ backgroundImage: "none" }}>
                    <Banknote className="h-4 w-4" /> Sacar
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-medium">
              <span className="flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 ring-1 ring-white/20">
                <Banknote className="h-3 w-3" /> {formatBRL(sacadoAll)} sacados
              </span>
              <span className="rounded-full bg-white/14 px-2.5 py-1 ring-1 ring-white/20">
                {paid.length} pagamento{paid.length === 1 ? "" : "s"} em 7 dias
              </span>
              {pendingNow > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 ring-1 ring-white/20">
                  <span className="relative grid h-1.5 w-1.5 place-items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    <span className="absolute inset-0 rounded-full bg-amber-300 animate-pulse-ring" />
                  </span>
                  {pendingNow} aguardando pagamento
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Pix pagos" subtitle="Valor pago · 7 dias" cents={gross} delta={delta} icon={DollarSign} />
          <StatCard title="Taxa Pagar.me" subtitle={`${gwLabel} descontado por Pix · 7 dias`} cents={gwFee} icon={Percent} />
          <StatCard title="Sacado" subtitle="Transferido para a conta · 7 dias" cents={sacado7d} icon={Banknote} />
          <StatCard title="Conversão" subtitle="Cobranças que foram pagas" value={`${conv}%`} icon={Target} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Cobranças recentes</CardTitle>
                <CardDescription>Últimas cobranças geradas com o seu código.</CardDescription>
              </div>
              <Link href="/app/gerar" className="sm:hidden">
                <Button size="sm">
                  <QrCode className="h-3.5 w-3.5" /> Gerar
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-2">
              <ChargeList items={recent.map(serializeCharge)} />
            </CardContent>
            <CardFooter>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Últimos 7 dias
              </span>
              <Link href="/app/historico" className="flex items-center gap-1 font-semibold text-primary hover:underline">
                Ver histórico completo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardFooter>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Status das cobranças</CardTitle>
                  <CardDescription>Distribuição nos últimos 7 dias.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {dist.map((s, i) => (
                  <div key={s.label}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-semibold tabular">{s.n}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full origin-left rounded-full animate-grow-x ${s.color}`}
                        style={{ width: `${period.length ? (s.n / period.length) * 100 : 0}%`, animationDelay: `${200 + i * 90}ms` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[11px] text-muted-foreground">Ticket médio</p>
                    <p className="mt-1 text-lg font-bold tabular">{formatBRL(ticket)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-[11px] text-muted-foreground">Líquido · 7 dias</p>
                    <p className="mt-1 text-lg font-bold tabular">{formatBRL(gross - gwFee)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Últimos saques</CardTitle>
                  <CardDescription>Como estão as suas transferências.</CardDescription>
                </div>
                <Link href="/app/saque#historico" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                  Ver todos <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="pt-2">
                <WithdrawalHistory items={withdrawals.map(serializeWithdrawal)} compact empty="Quando sacar, o status aparece aqui." />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
