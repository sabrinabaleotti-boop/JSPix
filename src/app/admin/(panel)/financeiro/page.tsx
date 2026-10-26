import Link from "next/link";
import { Banknote, Download, Landmark, Percent, TrendingUp, Wallet, DollarSign } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { PageHeader, Td, Th } from "@/components/admin/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { financeByClient, periodRange, PERIODS } from "@/lib/finance";
import { getLegacyBalance } from "@/lib/legacy";
import { isConfigured } from "@/lib/gateway";
import { formatBRL, cn } from "@/lib/utils";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await requireAdmin();
  const { periodo } = await searchParams;
  const range = periodRange(periodo);
  const { rows, totals } = await financeByClient(range);

  let legacyBalance: number | null = null;
  if (await isConfigured("legacy")) {
    try {
      legacyBalance = (await getLegacyBalance()).amount;
    } catch {
      legacyBalance = null;
    }
  }

  const visible = rows.filter((r) => r.paidCount > 0 || r.balanceCents !== 0 || r.paidOutCents > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Financeiro" description={`${range.label}. O saldo a repassar é sempre acumulado.`}>
        <a href={`/api/admin/export/financeiro?periodo=${range.key}`} download>
          <Button variant="outline">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </a>
        <Link href="/admin/financeiro/repasses">
          <Button variant="outline">
            <Wallet className="h-4 w-4" /> Repasses
          </Button>
        </Link>
        <Link href="/admin/financeiro/saque">
          <Button>
            <Banknote className="h-4 w-4" /> Sacar
          </Button>
        </Link>
      </PageHeader>

      <nav className="flex gap-1 overflow-x-auto rounded-2xl border bg-card p-1 shadow-card">
        {Object.entries(PERIODS).map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/financeiro?periodo=${k}`}
            className={cn(
              "shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
              range.key === k ? "gradient-primary text-white shadow-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Volume pago" subtitle={`${totals.paidCount} pagamento${totals.paidCount === 1 ? "" : "s"}`} cents={totals.grossCents} icon={DollarSign} highlight />
        <StatCard title="Sua receita" subtitle="Taxas cobradas dos clientes" cents={totals.ourFeeCents} icon={Percent} />
        <StatCard title="Lucro" subtitle={`Receita menos ${formatBRL(totals.gatewayFeeCents)} da gateway`} cents={totals.profitCents} icon={TrendingUp} />
        <StatCard title="A repassar" subtitle={`Repassado no período: ${formatBRL(totals.paidOutCents)}`} cents={totals.balanceCents} icon={Wallet} />
      </div>

      {legacyBalance !== null && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/12 text-primary">
              <Landmark className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold">Saldo disponível na Legacy</p>
              <p className="text-xs text-muted-foreground">O que dá para sacar ou repassar agora. Valores a liberar só aparecem no painel da Legacy.</p>
            </div>
            <p className="text-lg font-bold tabular">{formatBRL(legacyBalance)}</p>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/40">
              <tr>
                <Th>Cliente</Th>
                <Th className="text-right">Pagos</Th>
                <Th className="text-right">Bruto</Th>
                <Th className="text-right">Sua taxa</Th>
                <Th className="text-right">Gateway</Th>
                <Th className="text-right">Lucro</Th>
                <Th className="text-right">Líquido cliente</Th>
                <Th className="text-right">Repassado</Th>
                <Th className="text-right">Saldo a repassar</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((r) => (
                <tr key={r.clientId} className="hover:bg-accent/40">
                  <Td>
                    <Link href={`/admin/clientes/${r.clientId}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                  </Td>
                  <Td className="text-right tabular">{r.paidCount}</Td>
                  <Td className="text-right font-semibold tabular">{formatBRL(r.grossCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(r.ourFeeCents)}</Td>
                  <Td className="text-right tabular text-muted-foreground">{formatBRL(r.gatewayFeeCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(r.profitCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(r.clientNetCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(r.paidOutCents)}</Td>
                  <Td className={cn("text-right font-semibold tabular", r.balanceCents > 0 && "text-warning", r.balanceCents < 0 && "text-destructive")}>
                    {formatBRL(r.balanceCents)}
                  </Td>
                  <Td className="text-right">
                    {r.balanceCents > 0 && (
                      <Link href={`/admin/financeiro/repasses?cliente=${r.clientId}`} className="text-xs font-medium text-primary hover:underline">
                        Repassar
                      </Link>
                    )}
                  </Td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <Td className="py-10 text-center text-muted-foreground">Nenhum movimento no período.</Td>
                </tr>
              )}
            </tbody>
            {visible.length > 0 && (
              <tfoot className="border-t bg-muted/40 font-semibold">
                <tr>
                  <Td>Total</Td>
                  <Td className="text-right tabular">{totals.paidCount}</Td>
                  <Td className="text-right tabular">{formatBRL(totals.grossCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(totals.ourFeeCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(totals.gatewayFeeCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(totals.profitCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(totals.clientNetCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(totals.paidOutCents)}</Td>
                  <Td className="text-right tabular">{formatBRL(totals.balanceCents)}</Td>
                  <Td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
      <p className="text-[11px] text-muted-foreground">
        Custo da gateway: o valor informado pela Legacy quando disponível. Na Pagar.me e nas cobranças antigas, é estimado pela taxa configurada em Taxas.
        Cobranças simuladas não têm custo.
      </p>
    </div>
  );
}
