import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { ActionButton } from "@/components/admin/form";
import { KycLinkButton } from "@/components/admin/kyc-link-button";
import { PageHeader, Td, Th } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadRecipients } from "@/lib/recipients";
import { refreshRecipientsAction } from "@/app/admin/actions";

export const metadata = { title: "Recebedores" };

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "neutral" | "destructive" }> = {
  active: { label: "Ativo", variant: "success" },
  registration: { label: "Em cadastro", variant: "warning" },
  affiliation: { label: "Em análise", variant: "warning" },
  refused: { label: "Recusado", variant: "destructive" },
  suspended: { label: "Suspenso", variant: "destructive" },
  blocked: { label: "Bloqueado", variant: "destructive" },
  inactive: { label: "Inativo", variant: "neutral" },
};

export default async function RecebedoresPage() {
  await requireAdmin();
  const { recipients, error } = await loadRecipients();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Recebedores" description="Contas da Pagar.me que podem receber parte de cada Pix pelo split.">
        <ActionButton action={refreshRecipientsAction} label="Atualizar" />
        <Link href="/admin/configuracoes/recebedores/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo recebedor
          </Button>
        </Link>
      </PageHeader>

      {error && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{error}</p>}

      {recipients.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/40">
                <tr>
                  <Th>Nome</Th>
                  <Th>Documento</Th>
                  <Th>Status</Th>
                  <Th>ID</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {recipients.map((r) => {
                  const s = (r.status && STATUS[r.status]) || { label: r.status ?? "—", variant: "neutral" as const };
                  return (
                    <tr key={r.id}>
                      <Td className="font-medium">{r.name}</Td>
                      <Td className="tabular text-muted-foreground">{r.document ?? "—"}</Td>
                      <Td>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </Td>
                      <Td className="font-mono text-[11px] text-muted-foreground">{r.id}</Td>
                      <Td className="text-right">{r.status !== "active" && <KycLinkButton recipientId={r.id} />}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground">
        Depois do cadastro, a Pagar.me analisa o recebedor. Se pedir prova de vida, gere o link e envie para a pessoa (ou o sócio) abrir no celular. A lista fica em
        cache por 5 minutos; use Atualizar para ver mudanças de status na hora.
      </p>
    </div>
  );
}
