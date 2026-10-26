import Link from "next/link";
import { History } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawPanel } from "@/components/admin/withdraw-panel";
import { RefreshButton } from "@/components/refresh-button";
import { WithdrawalHistory } from "@/components/withdrawal-history";
import { getSecretKey } from "@/lib/pagarme";
import { getWithdrawFee, listWithdrawals, loadWithdrawRecipients, serializeWithdrawal } from "@/lib/withdraw";
import { withdrawAction } from "@/app/admin/actions";

export const metadata = { title: "Saque" };

export default async function SaquePage() {
  await requireAdmin();

  if (!(await getSecretKey())) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader eyebrow="Financeiro" title="Saque" description="Transfere o saldo de um recebedor para a conta bancária dele." />
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Configure a chave da Pagar.me em{" "}
            <Link href="/admin/configuracoes/gateway" className="font-medium text-primary hover:underline">
              Gateway
            </Link>{" "}
            para sacar.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ recipients, error }, fee, withdrawals] = await Promise.all([loadWithdrawRecipients(), getWithdrawFee(), listWithdrawals(null, 100)]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader eyebrow="Financeiro" title="Saque" description="Escolha o recebedor e o valor. O dinheiro vai para a conta bancária cadastrada nele." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div className="min-w-0 animate-fade-up">{error ? <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : <WithdrawPanel recipients={recipients} action={withdrawAction} fee={fee} />}</div>
        <Card className="min-w-0 animate-fade-up [animation-delay:120ms]">
          <CardHeader className="items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <History className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Histórico de saques</CardTitle>
                <CardDescription>Da conta inteira, com o cliente que pediu cada um.</CardDescription>
              </div>
            </div>
            <RefreshButton />
          </CardHeader>
          <CardContent className="pt-2">
            <WithdrawalHistory items={withdrawals.map(serializeWithdrawal)} showClient compact empty="Os saques feitos aqui ou pelos clientes aparecem nesta lista." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
