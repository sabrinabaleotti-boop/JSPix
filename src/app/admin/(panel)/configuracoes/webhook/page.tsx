import { requireAdmin } from "@/lib/admin";
import { headers } from "next/headers";
import { KeyRound, RotateCw } from "lucide-react";
import { SubmitButton } from "@/components/admin/form";
import { PageHeader, Td, Th } from "@/components/admin/page-header";
import { CopyField } from "@/components/admin/copy-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { decryptSecret } from "@/lib/crypto";
import { AdminForm } from "@/components/admin/form";
import { Input, Label } from "@/components/ui/input";
import { getLegacyWebhookSecret } from "@/lib/legacy";
import { generateWebhookCredentials, reprocessWebhookEvent, saveLegacyWebhookSecret } from "@/app/admin/actions";

export const metadata = { title: "Webhook" };

const EVENTS = ["order.paid", "order.payment_failed", "order.canceled", "charge.paid", "charge.payment_failed", "charge.refunded"];

export default async function WebhookPage() {
  await requireAdmin();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}/api/webhooks/pagarme`;

  const s = await getSettings(["webhook_user", "webhook_pass_enc", "webhook_token", "webhook_last_rejected"]);
  let password = "";
  try {
    password = s.webhook_pass_enc ? decryptSecret(s.webhook_pass_enc) : "";
  } catch {
    password = "";
  }
  const configured = !!s.webhook_token;
  const url = configured ? `${baseUrl}?token=${s.webhook_token}` : baseUrl;
  let rejected: { at: string; scheme: string; user: string; passLen: number; userOk: boolean; passLenOk: boolean; tokenLen?: number } | null = null;
  try {
    rejected = s.webhook_last_rejected ? JSON.parse(s.webhook_last_rejected) : null;
  } catch {
    rejected = null;
  }
  const [events, legacySecret] = await Promise.all([db.webhookEvent.findMany({ orderBy: { receivedAt: "desc" }, take: 50 }), getLegacyWebhookSecret()]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Webhook" description="A gateway avisa o JSPix quando um Pix é pago, e o status muda na hora." />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Legacy Ecom</CardTitle>
            <CardDescription>
              Não precisa cadastrar nada: o JSPix envia o endereço do webhook em cada cobrança, com um token secreto. Ao receber um evento, o JSPix consulta a
              Legacy para confirmar o status antes de marcar como pago.
            </CardDescription>
          </div>
          <Badge variant="success">Automático</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Endereço usado nas cobranças" value={`${proto}://${host}/api/webhooks/legacy?token=…`} />
          <AdminForm action={saveLegacyWebhookSecret} submitLabel={legacySecret ? "Atualizar segredo" : "Salvar segredo"}>
            <div>
              <Label htmlFor="webhookSecret">Segredo de assinatura (opcional)</Label>
              <Input id="webhookSecret" name="webhookSecret" type="password" autoComplete="off" placeholder="whsec_..." className="font-mono" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {legacySecret
                  ? "Assinatura ativa: eventos sem assinatura válida são recusados. Salve vazio para desligar."
                  : "Ative a assinatura no painel da Legacy primeiro, depois cole aqui o segredo whsec_ gerado. Se salvar antes de ativar lá, os eventos serão recusados."}
              </p>
            </div>
          </AdminForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pagar.me</CardTitle>
            <CardDescription>Em dash.pagar.me, Configurações, Webhooks, crie um webhook com esta URL. O segredo já vai na URL: em Autenticação, deixe “Nenhuma”.</CardDescription>
          </div>
          {configured ? <Badge variant="success">Configurado</Badge> : <Badge variant="warning">Pendente</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="URL do webhook (com o segredo)" value={url} secret={configured} />
          {!configured && <p className="text-sm text-muted-foreground">Gere o segredo. Sem ele o endpoint recusa todos os eventos.</p>}
          {configured && s.webhook_user && password && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Alternativa: autenticação básica (se preferir a URL sem segredo)</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <CopyField label="URL" value={baseUrl} />
                <div />
                <CopyField label="Usuário" value={s.webhook_user} />
                <CopyField label="Senha" value={password} secret />
              </div>
            </details>
          )}
          {rejected && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
              <p className="font-semibold">Última chamada recusada (401) em {new Date(rejected.at).toLocaleString("pt-BR")}</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li>Segredo na URL: {rejected.tokenLen ? `recebido com ${rejected.tokenLen} caracteres, mas não confere` : "não veio (a URL cadastrada na Pagar.me está sem o ?token=)"}</li>
                <li>Autenticação básica: {rejected.scheme === "nenhum" ? "não enviada" : rejected.scheme}</li>
                {rejected.scheme !== "nenhum" && (
                  <>
                    <li>
                      Usuário recebido: <span className="font-mono">{rejected.user || "(vazio)"}</span> {rejected.userOk ? "✓ confere" : `✗ esperado ${s.webhook_user}`}
                    </li>
                    <li>
                      Senha recebida: {rejected.passLen} caracteres {rejected.passLenOk ? "(tamanho confere, mas o conteúdo não)" : `(esperado ${password.length})`}
                    </li>
                  </>
                )}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Eventos para marcar</p>
            <div className="flex flex-wrap gap-1.5">
              {EVENTS.map((e) => (
                <Badge key={e} variant="outline" className="font-mono">
                  {e}
                </Badge>
              ))}
            </div>
          </div>
          <form action={generateWebhookCredentials}>
            <SubmitButton variant={configured ? "outline" : "primary"}>
              <KeyRound className="h-4 w-4" /> {configured ? "Gerar novo segredo" : "Gerar segredo"}
            </SubmitButton>
            {configured && <p className="mt-1.5 text-[11px] text-muted-foreground">Ao gerar um novo segredo, atualize a URL também na Pagar.me.</p>}
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>Últimos eventos recebidos</CardTitle>
            <CardDescription>Os 50 mais recentes.</CardDescription>
          </div>
        </CardHeader>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead className="border-y bg-muted/40">
              <tr>
                <Th>Recebido</Th>
                <Th>Tipo</Th>
                <Th>Resultado</Th>
                <Th className="text-right">Ação</Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((e) => (
                <tr key={e.id}>
                  <Td className="text-muted-foreground">{e.receivedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })}</Td>
                  <Td className="font-mono text-xs">{e.type}</Td>
                  <Td>
                    {e.processed && !e.error && <Badge variant="success">Processado</Badge>}
                    {e.processed && e.error && <span className="text-xs text-muted-foreground">{e.error}</span>}
                    {!e.processed && <span className="text-xs text-destructive">{e.error ?? "Não processado"}</span>}
                  </Td>
                  <Td className="text-right">
                    <form action={reprocessWebhookEvent.bind(null, e.id)}>
                      <SubmitButton variant="ghost" className="h-8 px-2.5 text-xs">
                        <RotateCw className="h-3.5 w-3.5" /> Reprocessar
                      </SubmitButton>
                    </form>
                  </Td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <Td className="py-10 text-center text-muted-foreground">Nenhum evento recebido ainda.</Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
