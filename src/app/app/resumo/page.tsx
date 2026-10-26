import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, DollarSign, Percent, QrCode, Target, TrendingUp, Wallet } from "lucide-react";
import { ChargeList } from "@/components/charge-list";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientId } from "@/lib/auth";
import { computeOurFee, serializeCharge } from "@/lib/charges";
import { db } from "@/lib/db";
import { PERIODS, periodRange } from "@/lib/finance";
import { cn, formatBRL } from "@/lib/utils";

export const metadata = { title: "Resumo" };

function dayKey(d: Date) {
  return d.toLocaleDateString("sv-SE");
}

export default async function ResumoPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const { periodo } = await searchParams;
  const range = periodRange(periodo);

  await db.charge.updateMany({ where: { clientId, status: "pending", expiresAt: { lt: new Date() } }, data: { status: "expired" } });

  const createdFilter = range.from || range.to ? { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lt: range.to } : {}) } : undefined;
  const [charges, paidInPeriod] = await Promise.all([
    db.charge.findMany({ where: { clientId, ...(createdFilter ? { createdAt: createdFilter } : {}) } }),
    db.charge.findMany({ where: { clientId, status: "paid", ...(createdFilter ? { paidAt: createdFilter } : {}) }, orderBy: { paidAt: "desc" } }),
  ]);

  const feeOf = (c: (typeof charges)[number]) => c.ourFeeCents || computeOurFee(c.amountCents, Number(c.feePercent), c.feeFixedCents);
  const gross = paidInPeriod.reduce((s, c) => s + c.amountCents, 0);
  const fees = paidInPeriod.reduce((s, c) => s + feeOf(c), 0);
  const net = gross - fees;
  const ticket = paidInPeriod.length ? Math.round(gross / paidInPeriod.length) : 0;
  const paidCount = charges.filter((c) => c.status === "paid").length;
  const conv = charges.length ? Math.round((paidCount / charges.length) * 100) : 0;

  const count = (s: string) => charges.filter((c) => c.status === s).length;
  const dist = [
    { label: "Pagas", n: count("paid"), color: "bg-success" },
    { label: "Pendentes", n: count("pending"), color: "bg-warning" },
    { label: "Expiradas", n: count("expired"), color: "bg-muted-foreground/50" },
    { label: "Canceladas / falhas", n: count("canceled") + count("failed"), color: "bg-destructive" },
  ];

  // Barras por dia: o período escolhido ou, quando é "tudo", os últimos 30 dias.
  const end = range.to ? new Date(range.to.getTime() - 1) : new Date();
  const start = range.from ?? new Date(end.getTime() - 29 * 86400000);
  const days: { key: string; label: string; cents: number; n: number }[] = [];
  for (let d = new Date(start.getFullYear(), start.getMonth(), start.getDate()); d <= end; d = new Date(d.getTime() + 86400000)) {
    days.push({ key: dayKey(d), label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), cents: 0, n: 0 });
  }
  for (const c of paidInPeriod) {
    const k = dayKey(c.paidAt ?? c.createdAt);
    const day = days.find((x) => x.key === k);
    if (day) {
      day.cents += c.amountCents;
      day.n += 1;
    }
  }
  const maxDay = Math.max(1, ...days.map((d) => d.cents));
  const labelEvery = days.length > 14 ? Math.ceil(days.length / 6) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader eyebrow="Desempenho" title="Resumo" description={`${range.label}. Valores pagos e cobranças geradas no período.`} />

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border bg-card p-1 shadow-card animate-fade-up [animation-delay:60ms]">
        {Object.entries(PERIODS).map(([k, label]) => (
          <Link
            key={k}
            href={`/app/resumo?periodo=${k}`}
            className={cn(
              "shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
              range.key === k ? "gradient-primary text-white shadow-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="stagger space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Recebido" subtitle={`${paidInPeriod.length} pagamento${paidInPeriod.length === 1 ? "" : "s"}`} cents={gross} icon={DollarSign} highlight />
          <StatCard title="Líquido" subtitle="O que ficou para você" cents={net} icon={Wallet} />
          <StatCard title="Taxas" subtitle="Descontadas dos pagamentos" cents={fees} icon={Percent} />
          <StatCard title="Ticket médio" subtitle="Valor médio por pagamento" cents={ticket} icon={TrendingUp} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recebido por dia</CardTitle>
                <CardDescription>Soma dos Pix pagos em cada dia.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              {gross === 0 ? (
                <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                    <QrCode className="h-5 w-5" />
                  </span>
                  <p className="text-sm text-muted-foreground">Nenhum pagamento no período.</p>
                </div>
              ) : (
                <div>
                  <div className="flex h-44 items-end gap-[3px] sm:gap-1.5">
                    {days.map((d, i) => (
                      <div key={d.key} className="group relative flex h-full flex-1 items-end">
                        <div
                          className={cn(
                            "w-full origin-bottom rounded-t-md transition-colors animate-grow-y",
                            d.cents > 0 ? "gradient-primary group-hover:brightness-110" : "bg-muted",
                          )}
                          style={{ height: `${d.cents > 0 ? Math.max(6, (d.cents / maxDay) * 100) : 4}%`, animationDelay: `${i * 25}ms` }}
                        />
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-[11px] opacity-0 shadow-card transition-opacity group-hover:opacity-100">
                          <span className="font-semibold tabular">{formatBRL(d.cents)}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {d.label} · {d.n} pix
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    {days.map((d, i) => (
                      <span key={d.key} className={cn("flex-1 text-center", i % labelEvery !== 0 && i !== days.length - 1 && "invisible")}>
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Status das cobranças</CardTitle>
                <CardDescription>{charges.length} geradas no período.</CardDescription>
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
                      style={{ width: `${charges.length ? (s.n / charges.length) * 100 : 0}%`, animationDelay: `${200 + i * 90}ms` }}
                    />
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Target className="h-3 w-3" /> Conversão
                  </p>
                  <p className="mt-1 text-lg font-bold tabular">{conv}%</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <QrCode className="h-3 w-3" /> Cobranças
                  </p>
                  <p className="mt-1 text-lg font-bold tabular">{charges.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pagamentos no período</CardTitle>
              <CardDescription>Os 10 mais recentes.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ChargeList items={paidInPeriod.slice(0, 10).map(serializeCharge)} empty="Nenhum pagamento no período." />
          </CardContent>
          <CardFooter>
            <span className="text-muted-foreground">{paidInPeriod.length} no total</span>
            <Link href="/app/historico?status=paid" className="flex items-center gap-1 font-semibold text-primary hover:underline">
              Ver todas as pagas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
