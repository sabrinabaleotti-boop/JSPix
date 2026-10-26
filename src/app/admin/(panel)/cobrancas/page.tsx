import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { Download, RefreshCw, X } from "lucide-react";
import type { ChargeStatus, Prisma } from "@prisma/client";
import { PageHeader, Td, Th } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/form";
import { statusMeta } from "@/components/charge-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { hideCpf } from "@/lib/masks";
import { formatBRL } from "@/lib/utils";
import { adminCancelCharge, adminReconsultCharge } from "@/app/admin/actions";
import { syncExpiredCharges } from "@/lib/expiry-sync";

export const metadata = { title: "Cobranças" };

const STATUSES: ChargeStatus[] = ["pending", "paid", "expired", "canceled", "failed", "refunded"];

export default async function CobrancasPage({ searchParams }: { searchParams: Promise<{ cliente?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  const { cliente = "", status = "", page = "1" } = await searchParams;
  const take = 25;
  const p = Math.max(1, Number(page) || 1);

  await syncExpiredCharges();

  const where: Prisma.ChargeWhereInput = {
    ...(cliente ? { clientId: cliente } : {}),
    ...(STATUSES.includes(status as ChargeStatus) ? { status: status as ChargeStatus } : {}),
  };

  const [clients, items, total, sum] = await Promise.all([
    db.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.charge.findMany({ where, orderBy: { createdAt: "desc" }, skip: (p - 1) * take, take, include: { client: { select: { name: true } } } }),
    db.charge.count({ where }),
    db.charge.aggregate({ where: { ...where, status: "paid" }, _sum: { amountCents: true, ourFeeCents: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  const qs = (extra: Record<string, string | number>) =>
    "?" + new URLSearchParams({ ...(cliente ? { cliente } : {}), ...(status ? { status } : {}), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) }).toString();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Cobranças"
        description={`${total} cobrança${total === 1 ? "" : "s"} · pago ${formatBRL(sum._sum.amountCents ?? 0)} · suas taxas ${formatBRL(sum._sum.ourFeeCents ?? 0)}`}
      >
        { }
        <a href={`/api/admin/export/cobrancas${qs({}).replace(/^\?$/, "")}`} download>
          <Button variant="outline">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </a>
      </PageHeader>

      <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" method="get">
        <Select name="cliente" defaultValue={cliente} aria-label="Cliente">
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusMeta[s].label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline" className="h-11">
          Filtrar
        </Button>
      </form>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/40">
              <tr>
                <Th>Data</Th>
                <Th>Cliente</Th>
                <Th>Descrição</Th>
                <Th>Pagador</Th>
                <Th className="text-right">Valor</Th>
                <Th className="text-right">Taxa</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((c) => {
                const simulated = c.gateway === "simulated";
                return (
                  <tr key={c.id} className="hover:bg-accent/40">
                    <Td className="text-muted-foreground">{c.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</Td>
                    <Td>
                      <Link href={`/admin/clientes/${c.clientId}`} className="hover:underline">
                        {c.client.name}
                      </Link>
                    </Td>
                    <Td className="max-w-48 truncate">{c.description || <span className="text-muted-foreground">—</span>}</Td>
                    <Td>
                      <span className="block">{c.payerName}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{hideCpf(c.payerCpf)}</span>
                    </Td>
                    <Td className="text-right font-semibold tabular">{formatBRL(c.amountCents)}</Td>
                    <Td className="text-right tabular text-muted-foreground">
                      {c.status === "paid" ? formatBRL(c.ourFeeCents) : `${Number(c.feePercent).toFixed(2).replace(".", ",")}%`}
                    </Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <Badge variant={statusMeta[c.status].variant}>{statusMeta[c.status].label}</Badge>
                        <Badge variant="outline">{simulated ? "Sim." : c.gateway === "legacy" ? "Legacy" : "Pagar.me"}</Badge>
                      </span>
                    </Td>
                    <Td className="text-right">
                      {c.status === "pending" && (
                        <span className="inline-flex gap-1.5">
                          <form action={adminReconsultCharge.bind(null, c.id)}>
                            <SubmitButton variant="outline" className="h-8 px-2.5 text-xs">
                              <RefreshCw className="h-3.5 w-3.5" /> Reconsultar
                            </SubmitButton>
                          </form>
                          <form action={adminCancelCharge.bind(null, c.id)}>
                            <SubmitButton variant="ghost" className="h-8 px-2.5 text-xs text-destructive">
                              <X className="h-3.5 w-3.5" /> {c.gateway === "legacy" ? "Cancelar no JSPix" : "Cancelar"}
                            </SubmitButton>
                          </form>
                        </span>
                      )}
                    </Td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <Td className="py-10 text-center text-muted-foreground">Nenhuma cobrança com esses filtros.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Página {p} de {pages}
          </span>
          <div className="flex gap-3">
            {p > 1 && (
              <Link className="text-primary" href={qs({ page: p - 1 })}>
                ← Anterior
              </Link>
            )}
            {p < pages && (
              <Link className="text-primary" href={qs({ page: p + 1 })}>
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
