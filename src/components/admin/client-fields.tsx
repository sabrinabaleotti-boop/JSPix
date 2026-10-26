import type { Client } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { centsToInput, percentToInput } from "@/lib/money";

function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function ClientFields({ client, defaults }: { client?: Client | null; defaults: { feePercent: string; minAmount: string; expiry: string } }) {
  return (
    <>
      {client && <input type="hidden" name="id" value={client.id} />}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cliente</CardTitle>
            <CardDescription>Nome exibido no painel e código de acesso.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input name="name" defaultValue={client?.name} required />
          </Field>
          <Field label="Código de acesso" hint={client ? "4 a 8 dígitos." : "Deixe vazio para gerar um código de 6 dígitos."}>
            <Input name="accessCode" inputMode="numeric" defaultValue={client?.accessCode} className="font-mono" />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={client?.active ?? true} className="h-4 w-4 accent-[rgb(var(--primary))]" />
            Cliente ativo (pode entrar e gerar Pix)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Taxas e limites</CardTitle>
            <CardDescription>Deixe vazio para usar o padrão global.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Taxa (%)" hint={`Padrão: ${defaults.feePercent}%`}>
            <Input name="feePercent" inputMode="decimal" defaultValue={percentToInput(client?.feePercent?.toString())} placeholder={defaults.feePercent} />
          </Field>
          <Field label="Taxa fixa (R$)" hint="Por cobrança paga">
            <Input name="feeFixed" inputMode="decimal" defaultValue={centsToInput(client?.feeFixedCents)} placeholder="0,00" />
          </Field>
          <Field label="Valor mínimo (R$)" hint={`Padrão: R$ ${defaults.minAmount}`}>
            <Input name="minAmount" inputMode="decimal" defaultValue={centsToInput(client?.minAmountCents)} placeholder={defaults.minAmount} />
          </Field>
          <Field label="Valor máximo (R$)" hint="Vazio = sem limite">
            <Input name="maxAmount" inputMode="decimal" defaultValue={centsToInput(client?.maxAmountCents)} />
          </Field>
          <Field label="Expiração padrão (min)" hint={`Padrão: ${defaults.expiry} min`}>
            <Input name="defaultExpiryMin" inputMode="numeric" defaultValue={client?.defaultExpiryMin ?? ""} placeholder={defaults.expiry} />
          </Field>
          <Field label="Tipo da chave Pix">
            <Select name="payoutPixKeyType" defaultValue={client?.payoutPixKeyType ?? ""}>
              <option value="">—</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="PHONE">Telefone</option>
              <option value="EVP">Aleatória</option>
            </Select>
          </Field>
          <Field label="Chave Pix para repasse" className="sm:col-span-2">
            <Input name="payoutPixKey" defaultValue={client?.payoutPixKey ?? ""} />
          </Field>
        </CardContent>
      </Card>
    </>
  );
}
