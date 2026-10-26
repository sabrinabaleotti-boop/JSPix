import { requireAdmin } from "@/lib/admin";
import { ActionButton, AdminForm, SubmitButton } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { getSetting } from "@/lib/settings";
import { keyEnvironment } from "@/lib/pagarme";
import { getLegacyCredentials } from "@/lib/legacy";
import { getEffectiveGateway, getSelectedGateway, GATEWAY_LABEL } from "@/lib/gateway";
import { decryptSecret } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { removeLegacyKeys, removePagarmeKey, saveLegacy, savePagarme, selectGateway, testLegacy, testPagarme } from "@/app/admin/actions";

export const metadata = { title: "Gateway" };

const mask = (k: string) => `${k.slice(0, 8)}••••••••${k.slice(-4)}`;

export default async function GatewayPage() {
  await requireAdmin();
  const [selected, effective, legacy, enc] = await Promise.all([getSelectedGateway(), getEffectiveGateway(), getLegacyCredentials(), getSetting("pagarme_secret_enc")]);

  const pagarmeEnv = process.env.PAGARME_SECRET_KEY?.trim() || "";
  let pagarmeDb = "";
  try {
    pagarmeDb = enc ? decryptSecret(enc) : "";
  } catch {
    pagarmeDb = "";
  }
  const pagarmeKey = pagarmeEnv || pagarmeDb;
  const pagarmeKind = pagarmeKey ? keyEnvironment(pagarmeKey) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Gateway de pagamento" description="Escolha quem emite os Pix. Cada cobrança continua ligada à gateway que a criou." />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Gateway ativa</CardTitle>
            <CardDescription>
              Emitindo agora: <span className="font-semibold text-foreground">{GATEWAY_LABEL[effective]}</span>
              {effective === "simulated" && " (a gateway escolhida ainda não tem credenciais)"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <AdminForm action={selectGateway} submitLabel="Usar esta gateway">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["pagarme", "Pagar.me", pagarmeKey ? (pagarmeKind === "test" ? "Chave de teste" : "Chave de produção") : "Sem chave"],
                  ["legacy", "Legacy Ecom", legacy ? "Chaves configuradas" : "Sem chaves"],
                ] as const
              ).map(([value, label, hint]) => (
                <label
                  key={value}
                  className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5")}
                >
                  <input type="radio" name="gateway" value={value} defaultChecked={selected === value} className="mt-1 accent-[rgb(var(--primary))]" />
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </AdminForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Legacy Ecom</CardTitle>
            <CardDescription>
              Em Integrações no painel da Legacy, gere o par de chaves. A Legacy só tem chaves de produção e exige o KYC aprovado. As chaves são
              validadas antes de salvar e a secret fica cifrada.
            </CardDescription>
          </div>
          {legacy ? <Badge variant="success">Configurada</Badge> : <Badge variant="neutral">Sem chaves</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {legacy && (
            <div className="space-y-3">
              <p className="font-mono text-sm">
                {legacy.publicKey} · {mask(legacy.secretKey)}
              </p>
              {legacy.source === "env" && <p className="text-xs text-muted-foreground">Vindo das variáveis LEGACY_PUBLIC_KEY e LEGACY_SECRET_KEY no Render.</p>}
              <div className="flex flex-wrap gap-3">
                <ActionButton action={testLegacy} label="Testar conexão" />
                {legacy.source === "db" && (
                  <form action={removeLegacyKeys}>
                    <SubmitButton variant="ghost" className="text-destructive">
                      Remover chaves
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          )}
          <AdminForm action={saveLegacy} submitLabel={legacy ? "Trocar chaves" : "Validar e salvar"}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="publicKey">Public Key</Label>
                <Input id="publicKey" name="publicKey" autoComplete="off" placeholder="pk_live_..." className="font-mono" />
              </div>
              <div>
                <Label htmlFor="lsk">Secret Key</Label>
                <Input id="lsk" name="secretKey" type="password" autoComplete="off" placeholder="sk_live_..." className="font-mono" />
              </div>
            </div>
          </AdminForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pagar.me</CardTitle>
            <CardDescription>
              Em dash.pagar.me, Configurações, Chaves. Use a <span className="font-mono">sk_test_</span> para testar e a <span className="font-mono">sk_</span> de
              produção para cobrar de verdade. A chave é validada antes de salvar e fica cifrada.
            </CardDescription>
          </div>
          {pagarmeKey ? (
            <Badge variant={pagarmeKind === "test" ? "warning" : "success"}>{pagarmeKind === "test" ? "Teste" : "Produção"}</Badge>
          ) : (
            <Badge variant="neutral">Sem chave</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {pagarmeKey && (
            <div className="space-y-3">
              <p className="font-mono text-sm">{mask(pagarmeKey)}</p>
              {pagarmeEnv && <p className="text-xs text-muted-foreground">Vindo da variável PAGARME_SECRET_KEY no Render.</p>}
              <div className="flex flex-wrap gap-3">
                <ActionButton action={testPagarme} label="Testar conexão" />
                {pagarmeDb && !pagarmeEnv && (
                  <form action={removePagarmeKey}>
                    <SubmitButton variant="ghost" className="text-destructive">
                      Remover chave
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          )}
          <AdminForm action={savePagarme} submitLabel={pagarmeKey ? "Trocar chave" : "Validar e salvar"}>
            <div>
              <Label htmlFor="secretKey">Secret key</Label>
              <Input id="secretKey" name="secretKey" type="password" autoComplete="off" placeholder="sk_test_..." className="font-mono" />
            </div>
          </AdminForm>
        </CardContent>
      </Card>
    </div>
  );
}
