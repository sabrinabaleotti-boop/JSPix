import { redirect } from "next/navigation";
import { ArrowRight, Calendar, DollarSign, QrCode, Wallet } from "lucide-react";
import Link from "next/link";
import { ChargeList } from "@/components/charge-list";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientId } from "@/lib/auth";
import { computeOurFee, periodBounds, serializeCharge } from "@/lib/charges";
import { clientBalance } from "@/lib/finance";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/utils";
import { getSetting } from "@/lib/settings";

export default async function AppHome() {
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const { since, prevSince } = periodBounds(7);

  // expira pendentes vencidas antes de contar
  await db.charge.updateMany({ where: { clientId, status: "pending", expiresAt: { lt: new Date() } }, data: { status: "expired" } });

  const [period, prev, recent, balance, client] = await Promise.all([
    db.charge.findMany({ where: { clientId, createdAt: { gte: since } } }),
    db.charge.findMany({ where: { clientId, createdAt: { gte: prevSince, lt: since }, status: "paid" } }),
    db.charge.findMany({ where: { clientId }, orderBy: { createdAt: "desc" }, take: 6 }),
    clientBalance(clientId),
    db.client.findUnique({ where: { id: clientId }, select: { feePercent: true } }),
  ]);

  const feePercent = client?.feePercent !== null ? Number(client?.feePercent) : Number(await getSetting("fee_percent"));

  const paid = period.filter((c) => c.status === "paid");
  const gross = paid.reduce((s, c) => s + c.amountCents, 0);
  const fees = paid.reduce((s, c) => s + (c.ourFeeCents || computeOurFee(c.amountCents, Number(c.feePercent), c.feeFixedCents)), 0);
  const net = gross - fees;
  const prevGross = prev.reduce((s, c) => s + c.amountCents, 0);
  const delta = prevGross > 0 ? ((gross - prevGross) / prevGross) * 100 : gross > 0 ? 100 : 0;

  const count = (s: string) => period.filter((c) => c.status === s).length;
  const dist = [
    { label: "Pagas", n: count("paid"), color: "bg-success" },
    { label: "Pendentes", n: count("pending"), color: "bg-warning" },
    { label: "Expiradas", n: count("expired"), color: "bg-muted-foreground/50" },
    { label: "Canceladas / falhas", n: count("canceled") + count("failed"), color: "bg-destructive" },
  ];
  const ticket = paid.length ? Math.round(gross / paid.length) : 0;
  const conv = period.length ? Math.round((paid.length / period.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Visão geral</h1>
          <p className="text-[13px] text-muted-foreground">Acompanhe cobranças, pagamentos e desempenho dos últimos 7 dias.</p>
        </div>
        <Link href="/app/gerar">
          <Button className="h-10">
            <QrCode className="h-4 w-4" /> Gerar Pix
          </Button>
        </Link>
      </div>

      <Card className="relative overflow-hidden border-transparent text-white [background:linear-gradient(135deg,#1b4fa0_0%,#2e7cd5_100%)] dark:[background:linear-gradient(135deg,#17408a_0%,#2978ff_100%)]">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-semibold">Saldo disponível</p>
            <p className="text-xs text-white/75">Total acumulado após taxa de {feePercent.toFixed(0).replace(".", ",")}%</p>
            <p className="mt-3 text-[34px] font-bold leading-none tracking-tight tabular">{formatBRL(balance)}</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white">
            <Wallet className="h-6 w-6" />
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Recebido (7d)" subtitle="Pagamentos confirmados" value={formatBRL(gross)} icon={DollarSign} />
        <StatCard title="Líquido (7d)" subtitle={`Após taxa de ${feePercent.toFixed(0)}%`} value={formatBRL(net)} delta={delta} icon={DollarSign} />
        <StatCard title="Cobranças (7d)" subtitle="Geradas no período" value={String(period.length)} icon={QrCode} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Cobranças recentes</CardTitle>
              <CardDescription>Últimas cobranças geradas com o seu código.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ChargeList items={recent.map(serializeCharge)} />
          </CardContent>
          <CardFooter>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Últimos 7 dias
            </span>
            <Link href="/app/historico" className="flex items-center gap-1 font-medium text-primary hover:underline">
              Ver histórico completo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Status das cobranças</CardTitle>
              <CardDescription>Distribuição nos últimos 7 dias.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {dist.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold tabular">{s.n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${s.color}`} style={{ width: `${period.length ? (s.n / period.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md bg-muted p-3">
                <p className="text-[11px] text-muted-foreground">Ticket médio</p>
                <p className="mt-1 text-lg font-bold tabular">{formatBRL(ticket)}</p>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="text-[11px] text-muted-foreground">Conversão</p>
                <p className="mt-1 text-lg font-bold tabular">{conv}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
