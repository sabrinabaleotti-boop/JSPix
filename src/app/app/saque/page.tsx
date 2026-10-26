import { redirect } from "next/navigation";
import { AlertTriangle, History } from "lucide-react";
import { WithdrawPanel } from "@/components/admin/withdraw-panel";
import { PageHeader } from "@/components/admin/page-header";
import { RefreshButton } from "@/components/refresh-button";
import { WithdrawalHistory } from "@/components/withdrawal-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientId } from "@/lib/auth";
import { getSecretKey } from "@/lib/pagarme";
import { getWithdrawFee, listWithdrawals, loadWithdrawRecipients, serializeWithdrawal } from "@/lib/withdraw";
import { clientWithdrawAction } from "@/app/app/actions";

export const metadata = { title: "Sacar" };

export default async function SaquePage() {
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const configured = !!(await getSecretKey());
  const [{ recipients, error }, fee, withdrawals] = await Promise.all([
    configured ? loadWithdrawRecipients() : { recipients: [], error: "Saque indisponível no momento. Tente novamente em instantes." },
    getWithdrawFee(),
    listWithdrawals(clientId, 50, configured),
  ]);
  const inProgress = withdrawals.filter((w) => w.status === "pending_transfer" || w.status === "processing").length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader eyebrow="Financeiro" title="Sacar" description="Transfira o saldo disponível para a sua conta bancária. Cai em até 1 dia útil." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div className="min-w-0 space-y-4 animate-fade-up">
          {error ? (
            <Card>
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
          ) : (
            <WithdrawPanel recipients={recipients} action={clientWithdrawAction} fee={fee} showDocument={false} historyHref="/app/saque#historico" />
          )}
        </div>

        <Card id="historico" className="min-w-0 scroll-mt-24 animate-fade-up [animation-delay:120ms]">
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
      </div>
    </div>
  );
}
