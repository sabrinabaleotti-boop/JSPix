import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { WithdrawPanel } from "@/components/admin/withdraw-panel";
import { getSecretKey } from "@/lib/pagarme";
import { getWithdrawFee, loadWithdrawRecipients } from "@/lib/withdraw";
import { withdrawAction } from "@/app/admin/actions";

export const metadata = { title: "Saque" };

export default async function SaquePage() {
  await requireAdmin();

  if (!(await getSecretKey())) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="Saque" description="Transfere o saldo de um recebedor para a conta bancária dele." />
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

  const [{ recipients, error }, fee] = await Promise.all([loadWithdrawRecipients(), getWithdrawFee()]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Saque" description="Escolha o recebedor e o valor. O dinheiro vai para a conta bancária cadastrada nele." />
      {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : <WithdrawPanel recipients={recipients} action={withdrawAction} fee={fee} />}
    </div>
  );
}
