import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, Td, Th } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { formatBRL } from "@/lib/utils";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  await requireAdmin();
  const [clients, stats, globalFee] = await Promise.all([
    db.client.findMany({ orderBy: { createdAt: "desc" } }),
    db.charge.groupBy({ by: ["clientId"], where: { status: "paid" }, _sum: { amountCents: true }, _count: true }),
    getSetting("fee_percent"),
  ]);
  const statOf = (id: string) => stats.find((s) => s.clientId === id);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Clientes" description={`${clients.length} cliente${clients.length === 1 ? "" : "s"} cadastrado${clients.length === 1 ? "" : "s"}`}>
        <Link href="/admin/clientes/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        </Link>
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/40">
              <tr>
                <Th>Cliente</Th>
                <Th>Código</Th>
                <Th>Taxa</Th>
                <Th className="text-right">Pagamentos</Th>
                <Th className="text-right">Volume pago</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((c) => {
                const s = statOf(c.id);
                const fee = c.feePercent !== null ? Number(c.feePercent) : Number(globalFee);
                return (
                  <tr key={c.id} className="hover:bg-accent/40">
                    <Td>
                      <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                    </Td>
                    <Td className="font-mono">{c.accessCode}</Td>
                    <Td>
                      {fee.toFixed(2).replace(".", ",")}%
                      {c.feePercent === null && <span className="ml-1 text-[11px] text-muted-foreground">(padrão)</span>}
                    </Td>
                    <Td className="text-right tabular">{s?._count ?? 0}</Td>
                    <Td className="text-right font-semibold tabular">{formatBRL(s?._sum.amountCents ?? 0)}</Td>
                    <Td>{c.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="neutral">Inativo</Badge>}</Td>
                  </tr>
                );
              })}
              {clients.length === 0 && (
                <tr>
                  <Td className="py-10 text-center text-muted-foreground">Nenhum cliente ainda.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
