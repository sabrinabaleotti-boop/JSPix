import { COUNTED_PAYOUT_STATUSES } from "@/lib/payouts";
import { requireAdmin } from "@/lib/admin";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { AdminForm, SubmitButton } from "@/components/admin/form";
import { ClientFields } from "@/components/admin/client-fields";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientSplitForm } from "@/components/admin/client-split-form";
import { asClientSplit, getSplitDefault } from "@/lib/split";
import { loadRecipients } from "@/lib/recipients";
import { clientFormDefaults } from "@/lib/client-defaults";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/utils";
import { regenerateCode, saveClient } from "@/app/admin/actions";

export const metadata = { title: "Cliente" };

export default async function ClientePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { novo } = await searchParams;
  const client = await db.client.findUnique({ where: { id } });
  if (!client) notFound();

  const clientSplit = asClientSplit(client.splitConfig);
  const [{ recipients, error: recipientsError }, splitDefault] = await Promise.all([loadRecipients(), getSplitDefault()]);
  const [defaults, paid, pending, payouts] = await Promise.all([
    clientFormDefaults(),
    db.charge.aggregate({ where: { clientId: id, status: "paid" }, _sum: { amountCents: true, ourFeeCents: true }, _count: true }),
    db.charge.count({ where: { clientId: id, status: "pending" } }),
    db.payout.aggregate({ where: { clientId: id, status: { in: COUNTED_PAYOUT_STATUSES } }, _sum: { amountCents: true } }),
  ]);
  const gross = paid._sum.amountCents ?? 0;
  const fees = paid._sum.ourFeeCents ?? 0;
  const toTransfer = gross - fees - (payouts._sum.amountCents ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Clientes
      </Link>
      <PageHeader title={client.name} description={`Criado em ${client.createdAt.toLocaleDateString("pt-BR")}`}>
        <Link href={`/admin/cobrancas?cliente=${client.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Ver cobranças <ArrowRight className="h-4 w-4" />
        </Link>
      </PageHeader>

      {novo && (
        <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Cliente criado. Envie o código <span className="font-mono font-semibold">{client.accessCode}</span> para ele entrar no painel.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Pago", formatBRL(gross)],
          ["Suas taxas", formatBRL(fees)],
          ["A repassar", formatBRL(toTransfer)],
          ["Pendentes", String(pending)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-bold tabular">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Código de acesso</p>
            <p className="font-mono text-2xl font-bold tracking-[0.2em]">{client.accessCode}</p>
          </div>
          <form action={regenerateCode.bind(null, client.id)}>
            <SubmitButton variant="outline">
              <RefreshCw className="h-4 w-4" /> Gerar novo código
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Split de pagamento</CardTitle>
            <CardDescription>Como os Pix deste cliente são divididos entre os recebedores da Pagar.me.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recipientsError && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{recipientsError}</p>}
          <ClientSplitForm
            clientId={client.id}
            initialMode={clientSplit?.mode ?? "default"}
            initialRules={clientSplit?.mode === "custom" ? clientSplit.rules : []}
            recipients={recipients}
            defaultSummary={splitDefault.enabled ? splitDefault.rules.map((r) => `${r.name} ${r.percent}%`).join(" · ") : "Split padrão desligado"}
          />
        </CardContent>
      </Card>

      <AdminForm action={saveClient} submitLabel="Salvar alterações">
        <ClientFields client={client} defaults={defaults} />
      </AdminForm>
    </div>
  );
}
