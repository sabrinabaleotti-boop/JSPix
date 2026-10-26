import { requireAdmin } from "@/lib/admin";
import { AdminForm } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getSettings } from "@/lib/settings";
import { centsToInput, percentToInput } from "@/lib/money";
import { saveFees } from "@/app/admin/actions";

export const metadata = { title: "Taxas" };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default async function TaxasPage() {
  await requireAdmin();
  const s = await getSettings(["fee_percent", "fee_fixed_cents", "gateway_fee_percent", "withdraw_fee_cents", "min_amount_cents", "max_amount_cents", "default_expiry_min"]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Taxas" description="Padrões globais. Cada cliente pode ter valores próprios no cadastro dele." />
      <AdminForm action={saveFees} submitLabel="Salvar taxas">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sua taxa</CardTitle>
              <CardDescription>Cobrada sobre cada Pix pago. O valor fica registrado na cobrança, então mudar aqui não altera cobranças antigas.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Taxa percentual (%)">
              <Input name="feePercent" inputMode="decimal" defaultValue={percentToInput(s.fee_percent)} required />
            </Field>
            <Field label="Taxa fixa por Pix pago (R$)">
              <Input name="feeFixed" inputMode="decimal" defaultValue={centsToInput(Number(s.fee_fixed_cents))} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Custo da Pagar.me</CardTitle>
              <CardDescription>Usado no financeiro para estimar seu lucro. Confira o valor no seu contrato com a Pagar.me.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Taxa da Pagar.me sobre Pix (%)">
              <Input name="gatewayFeePercent" inputMode="decimal" defaultValue={percentToInput(s.gateway_fee_percent)} required />
            </Field>
            <Field label="Tarifa de saque (R$)" hint="Sai do saldo além do valor sacado. A tela de saque desconta esse valor do máximo.">
              <Input name="withdrawFee" inputMode="decimal" defaultValue={centsToInput(Number(s.withdraw_fee_cents))} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Limites das cobranças</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Valor mínimo (R$)">
              <Input name="minAmount" inputMode="decimal" defaultValue={centsToInput(Number(s.min_amount_cents))} />
            </Field>
            <Field label="Valor máximo (R$)" hint="0 = sem limite">
              <Input name="maxAmount" inputMode="decimal" defaultValue={centsToInput(Number(s.max_amount_cents))} />
            </Field>
            <Field label="Expiração padrão">
              <Select name="defaultExpiryMin" defaultValue={s.default_expiry_min}>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="1440">24 horas</option>
              </Select>
            </Field>
          </CardContent>
        </Card>
      </AdminForm>
    </div>
  );
}
