import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { ActionButton, AdminForm } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/page-header";
import { SplitEditor } from "@/components/admin/split-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSplitDefault } from "@/lib/split";
import { loadRecipients } from "@/lib/recipients";
import { getSelectedGateway } from "@/lib/gateway";
import { refreshRecipientsAction, saveSplitDefaultAction } from "@/app/admin/actions";
import { getSecretKey } from "@/lib/pagarme";

export const metadata = { title: "Split" };

export default async function SplitPage() {
  await requireAdmin();
  const [split, { recipients, error }, gateway, hasKey] = await Promise.all([getSplitDefault(), loadRecipients(), getSelectedGateway(), getSecretKey().then((k) => !!k)]);

  const canSplit = hasKey && gateway === "pagarme" && recipients.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Split de pagamento" description="Divide cada Pix pago entre recebedores da sua conta Pagar.me.">
        {hasKey && <ActionButton action={refreshRecipientsAction} label="Atualizar recebedores" />}
        {hasKey && (
          <Link href="/admin/configuracoes/recebedores/novo">
            <Button variant="outline">
              <Plus className="h-4 w-4" /> Novo recebedor
            </Button>
          </Link>
        )}
      </PageHeader>

      {!hasKey && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Configure a chave da Pagar.me em <Link href="/admin/configuracoes" className="font-medium text-primary hover:underline">Configurações</Link> para usar o split.</p>
          </CardContent>
        </Card>
      )}

      {hasKey && gateway === "legacy" && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          A gateway ativa é a Legacy Ecom. O split só funciona nas cobranças da Pagar.me. Troque a gateway em Configurações para usar o split.
        </p>
      )}

      {hasKey && recipients.length === 0 && !error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              A conta não tem recebedores cadastrados. <Link href="/admin/configuracoes/recebedores/novo" className="font-medium text-primary hover:underline">Cadastre um recebedor</Link> para configurar o split.
            </p>
          </CardContent>
        </Card>
      )}

      {error && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{error}</p>}

      {canSplit && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Split padrão</CardTitle>
              <CardDescription>
                {recipients.length} recebedor{recipients.length === 1 ? "" : "es"} na conta. Defina a porcentagem de cada um. As porcentagens precisam fechar 100%.
              </CardDescription>
            </div>
            {split.enabled ? <Badge variant="success">Ativo</Badge> : <Badge variant="neutral">Desligado</Badge>}
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminForm action={saveSplitDefaultAction} submitLabel="Salvar split padrão">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="enabled" defaultChecked={split.enabled} className="h-4 w-4 accent-[rgb(var(--primary))]" />
                Ativar split padrão
              </label>
              <SplitEditor recipients={recipients} initial={split.rules} />
            </AdminForm>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground">
        A Pagar.me informa que o split está disponível para contas PSP. Se a conta não tiver o recurso, a criação do Pix falha com a mensagem da Pagar.me.
      </p>
    </div>
  );
}
