import { requireAdmin } from "@/lib/admin";
import { AdminForm } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSettings } from "@/lib/settings";
import { centsToInput } from "@/lib/money";
import { saveAutoTransfer } from "@/app/admin/actions";

export const metadata = { title: "Transferência automática" };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default async function TransferenciaAutomaticaPage() {
  await requireAdmin();
  const s = await getSettings(["auto_transfer_enabled", "auto_transfer_reserve_cents", "withdraw_fee_cents"]);
  const enabled = s.auto_transfer_enabled === "true";
  const withdrawFee = Number(s.withdraw_fee_cents) || 367;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Transferência automática" description="Saca o saldo do recebedor responsável assim que um pagamento é confirmado." />
      <AdminForm action={saveAutoTransfer} submitLabel="Salvar">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Auto-saque imediato</CardTitle>
              <CardDescription>
                Quando ativado, cada pagamento confirmado dispara um saque automático do saldo disponível do recebedor responsável pelo split, descontando a tarifa de saque (R$&nbsp;{(withdrawFee / 100).toFixed(2).replace(".", ",")}) e mantendo uma reserva mínima na conta.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input type="checkbox" name="enabled" defaultChecked={enabled} className="peer sr-only" />
              <span className="relative h-6 w-11 rounded-full bg-muted transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2" />
              <span className="text-sm font-medium">{enabled ? "Ativado" : "Desativado"}</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Reserva mínima</CardTitle>
              <CardDescription>
                Valor que fica sempre na conta do recebedor na Pagar.me. Serve para confirmar que a conta está ativa: se o botão de transferir estiver acessível, a conta está funcionando.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Field label="Reserva mínima (R$)" hint="O auto-saque nunca tira esse valor da conta. Recomendado: R$ 5,00.">
              <Input name="reserve" inputMode="decimal" defaultValue={centsToInput(Number(s.auto_transfer_reserve_cents) || 500)} required />
            </Field>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Como funciona</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>Um Pix é pago e confirmado pela Pagar.me.</li>
              <li>O sistema consulta o saldo disponível do recebedor responsável do split.</li>
              <li>
                Calcula: <strong>saldo disponível &minus; tarifa de saque (R$&nbsp;{(withdrawFee / 100).toFixed(2).replace(".", ",")}) &minus; reserva</strong>.
              </li>
              <li>Se o resultado for maior que R$&nbsp;1,00, solicita o saque automaticamente.</li>
            </ol>
            <p className="mt-3">
              <strong>Conta bloqueada:</strong> se a Pagar.me marcar o recebedor como inativo ou bloqueado, a geração de Pix é interrompida automaticamente e o pagador recebe um aviso.
            </p>
          </CardContent>
        </Card>
      </AdminForm>
    </div>
  );
}
