import { redirect } from "next/navigation";
import Link from "next/link";
import { ChargeList } from "@/components/charge-list";
import { Card, CardContent } from "@/components/ui/card";
import { getClientId } from "@/lib/auth";
import { serializeCharge } from "@/lib/charges";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import type { ChargeStatus } from "@prisma/client";

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
  const [items, total] = await Promise.all([
    db.charge.findMany({ where, orderBy: { createdAt: "desc" }, skip: (p - 1) * take, take }),
    db.charge.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Histórico</h1>
        <p className="text-[13px] text-muted-foreground">{total} cobrança{total === 1 ? "" : "s"}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/app/historico?status=${f.key}` : "/app/historico"}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
              status === f.key ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <Card>
        <CardContent className="py-2">
          <ChargeList items={items.map(serializeCharge)} empty="Nenhuma cobrança com esse filtro." />
        </CardContent>
      </Card>
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Página {p} de {pages}</span>
          <div className="flex gap-2">
            {p > 1 && <Link className="text-primary" href={`/app/historico?status=${status}&page=${p - 1}`}>← Anterior</Link>}
            {p < pages && <Link className="text-primary" href={`/app/historico?status=${status}&page=${p + 1}`}>Próxima →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
