import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ChargeList } from "@/components/charge-list";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getClientId } from "@/lib/auth";
import { serializeCharge } from "@/lib/charges";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { ChargeStatus } from "@prisma/client";

export const metadata = { title: "Histórico" };

const filters: { key: string; label: string }[] = [
  { key: "", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "paid", label: "Pagas" },
  { key: "expired", label: "Expiradas" },
  { key: "canceled", label: "Canceladas" },
];

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { status = "", page = "1" } = await searchParams;
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const take = 20;
  const p = Math.max(1, Number(page) || 1);

  await db.charge.updateMany({ where: { clientId, status: "pending", expiresAt: { lt: new Date() } }, data: { status: "expired" } });

  const where = { clientId, ...(status ? { status: status as ChargeStatus } : {}) };
  const [items, total, counts] = await Promise.all([
    db.charge.findMany({ where, orderBy: { createdAt: "desc" }, skip: (p - 1) * take, take }),
    db.charge.count({ where }),
    db.charge.groupBy({ by: ["status"], where: { clientId }, _count: true }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  const countOf = (k: string) => (k ? (counts.find((c) => c.status === k)?._count ?? 0) : counts.reduce((s, c) => s + c._count, 0));
  const pageHref = (n: number) => `/app/historico?${new URLSearchParams({ ...(status ? { status } : {}), page: String(n) })}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader eyebrow="Cobranças" title="Histórico" description={`${total} cobrança${total === 1 ? "" : "s"}${status ? " com esse filtro" : " no total"}`} />
      <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up [animation-delay:60ms]">
        {filters.map((f) => {
          const active = status === f.key;
          const n = countOf(f.key);
          return (
            <Link
              key={f.key}
              href={f.key ? `/app/historico?status=${f.key}` : "/app/historico"}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 press",
                active ? "border-primary gradient-primary text-white shadow-primary" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-[10px] tabular", active ? "bg-white/20" : "bg-muted")}>{n}</span>
            </Link>
          );
        })}
      </div>
      <Card className="animate-fade-up [animation-delay:120ms]">
        <CardContent className="py-2">
          <ChargeList items={items.map(serializeCharge)} empty="Nenhuma cobrança com esse filtro." />
        </CardContent>
      </Card>
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Página {p} de {pages}
          </span>
          <div className="flex gap-2">
            {p > 1 && (
              <Link href={pageHref(p - 1)} className="inline-flex h-9 items-center gap-1 rounded-xl border bg-card px-3 font-semibold text-foreground transition-colors hover:bg-accent">
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </Link>
            )}
            {p < pages && (
              <Link href={pageHref(p + 1)} className="inline-flex h-9 items-center gap-1 rounded-xl border bg-card px-3 font-semibold text-foreground transition-colors hover:bg-accent">
                Próxima <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
