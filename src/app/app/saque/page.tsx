import { redirect } from "next/navigation";
import { WithdrawPanel } from "@/components/admin/withdraw-panel";
import { getClientId } from "@/lib/auth";
import { getSecretKey } from "@/lib/pagarme";
import { getWithdrawFee, loadWithdrawRecipients } from "@/lib/withdraw";
import { clientWithdrawAction } from "@/app/app/actions";

export const metadata = { title: "Sacar" };

export default async function SaquePage() {
  if (!(await getClientId())) redirect("/");
  const configured = !!(await getSecretKey());
  const [{ recipients, error }, fee] = await Promise.all([
    configured ? loadWithdrawRecipients() : { recipients: [], error: "Saque indisponível no momento." },
    getWithdrawFee(),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Sacar</h1>
        <p className="text-[13px] text-muted-foreground">Escolha o recebedor e quanto quer sacar do saldo disponível.</p>
      </div>
      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : (
        <WithdrawPanel recipients={recipients} action={clientWithdrawAction} fee={fee} showDocument={false} />
      )}
    </div>
  );
}
