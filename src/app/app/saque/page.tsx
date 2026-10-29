import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AlertTriangle, History } from "lucide-react";
import { WithdrawPanel } from "@/components/admin/withdraw-panel";
import { PageHeader } from "@/components/admin/page-header";
import { RefreshButton } from "@/components/refresh-button";
import { HistorySkeleton, RecipientsSkeleton } from "@/components/withdraw-skeletons";
import { WithdrawalHistory } from "@/components/withdrawal-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientId } from "@/lib/auth";
import { getSecretKey } from "@/lib/pagarme";
import { getSplitDefault } from "@/lib/split";
import { getWithdrawFee, listWithdrawals, loadWithdrawRecipients, serializeWithdrawal, syncWithdrawalsFromPagarme } from "@/lib/withdraw";
import { clientWithdrawAction } from "@/app/app/actions";

export const metadata = { title: "Sacar" };

/** O cabeçalho sai na hora; contas (saldos na Pagar.me) e histórico chegam em paralelo, cada um com o seu esqueleto. */
export default async function SaquePage() {
  const clientId = await getClientId();
  if (!clientId) redirect("/");

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader eyebrow="Financeiro" title="Sacar" description="Transfira o saldo disponível para a sua conta bancária. Cai em até 1 dia útil." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Suspense fallback={<RecipientsSkeleton />}>
            <Recipients />
          </Suspense>
        </div>
        <Suspense fallback={<HistorySkeleton />}>
          <HistoryCard clientId={clientId} />
        </Suspense>
      </div>
    </div>
  );
}

async function Recipients() {
  const configured = !!(await getSecretKey());
  const [{ recipients, error }, fee] = await Promise.all([
    configured ? loadWithdrawRecipients() : { recipients: [], error: "Saque indisponível no momento. Tente novamente em instantes." },
    getWithdrawFee(),
  ]);
  if (error) {
    return (
      <Card className="animate-fade-up">
        <CardContent className="flex items-start gap-3 p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/12 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Saque indisponível</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="animate-fade-up">
      <WithdrawPanel recipients={recipients} action={clientWithdrawAction} fee={fee} showDocument={false} historyHref="/app/saque#historico" />
    </div>
  );
}

async function HistoryCard({ clientId }: { clientId: string }) {
  if (await getSecretKey()) await syncWithdrawalsFromPagarme();
  const splitDefault = await getSplitDefault();
  const responsibleId = splitDefault.enabled ? splitDefault.rules.find((r) => r.responsible)?.recipientId : null;
  const withdrawals = await listWithdrawals(clientId, { recipientId: responsibleId });
  const inProgress = withdrawals.filter((w) => w.status === "pending_transfer" || w.status === "processing").length;
  return (
    <Card id="historico" className="min-w-0 scroll-mt-24 animate-fade-up">
      <CardHeader className="items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Histórico de saques</CardTitle>
            <CardDescription>
              {withdrawals.length === 0 ? "Seus saques aparecem aqui." : `${withdrawals.length} saque${withdrawals.length === 1 ? "" : "s"}${inProgress ? ` · ${inProgress} em andamento` : ""}`}
            </CardDescription>
          </div>
        </div>
        <RefreshButton />
      </CardHeader>
      <CardContent className="pt-2">
        <WithdrawalHistory items={withdrawals.map(serializeWithdrawal)} />
      </CardContent>
    </Card>
  );
}
