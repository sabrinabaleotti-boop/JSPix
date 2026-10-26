import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { PageHeader, Td, Th } from "@/components/admin/page-header";
import { PayoutForm } from "@/components/admin/payout-form";
import { SubmitButton } from "@/components/admin/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { financeByClient } from "@/lib/finance";
import { isConfigured } from "@/lib/gateway";
import { PAYOUT_STATUS_LABEL } from "@/lib/payouts";
import { formatBRL } from "@/lib/utils";
import { deletePayout, refreshPayoutAction } from "@/app/admin/actions";

export const metadata = { title: "Repasses" };

export default async function RepassesPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  await requireAdmin();
  const { cliente } = await searchParams;
  const [{ rows }, payouts, legacyReady] = await Promise.all([
    financeByClient({}),
    db.payout.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { client: { select: { name: true } } } }),
    isConfigured("legacy"),
  ]);
  const today = new Date().toLocaleDateString("sv-SE");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/admin/financeiro" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Financeiro
      </Link>
      <PageHeader title="Repasses" description="O que já foi pago aos clientes. Cada repasse abate o saldo a repassar.">
        { }
        <a href="/api/admin/export/repasses" download>
          <Button variant="outline">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </a>
      </PageHeader>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Novo repasse</CardTitle>
            <CardDescription>O valor vem preenchido com o saldo do cliente e não pode passar dele.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PayoutForm
            key={cliente ?? "none"}
            clients={rows.map((r) => ({ id: r.clientId, name: r.name, balanceCents: r.balanceCents, pixKey: r.payoutPixKey, pixKeyType: r.payoutPixKeyType }))}
            initialClientId={cliente}
            legacyReady={legacyReady}
            today={today}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>Os 100 mais recentes.</CardDescription>
          </div>
        </CardHeader>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead className="border-y bg-muted/40">
              <tr>
                <Th>Data</Th>
                <Th>Cliente</Th>
                <Th className="text-right">Valor</Th>
                <Th>Forma</Th>
                <Th>Status</Th>
                <Th>Observação</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map((p) => {
                const st = PAYOUT_STATUS_LABEL[p.status] ?? { label: p.status, variant: "neutral" as const };
                const deletable = p.method === "manual" || p.status === "failed";
                return (
                  <tr key={p.id}>
                    <Td className="text-muted-foreground">{p.paidAt.toLocaleDateString("pt-BR")}</Td>
                    <Td>{p.client.name}</Td>
                    <Td className="text-right font-semibold tabular">{formatBRL(p.amountCents)}</Td>
                    <Td>{p.method === "legacy" ? <Badge variant="primary">Pix Legacy</Badge> : <Badge variant="outline">Manual</Badge>}</Td>
                    <Td>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {p.failureReason && <span className="mt-0.5 block max-w-56 truncate text-[11px] text-destructive">{p.failureReason}</span>}
                    </Td>
                    <Td className="max-w-56 truncate text-muted-foreground">
                      {p.note}
                      {p.receiptUrl && (
                        <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline">
                          comprovante <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </Td>
                    <Td className="text-right">
                      <span className="inline-flex gap-1">
                        {p.method === "legacy" && !["completed", "failed"].includes(p.status) && (
                          <form action={refreshPayoutAction.bind(null, p.id)}>
                            <SubmitButton variant="ghost" className="h-8 px-2.5 text-xs">
                              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
                            </SubmitButton>
                          </form>
                        )}
                        {deletable && (
                          <form action={deletePayout.bind(null, p.id)}>
                            <SubmitButton variant="ghost" className="h-8 px-2.5 text-xs text-destructive">
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </SubmitButton>
                          </form>
                        )}
                      </span>
                    </Td>
                  </tr>
                );
              })}
              {payouts.length === 0 && (
                <tr>
                  <Td className="py-10 text-center text-muted-foreground">Nenhum repasse registrado.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
