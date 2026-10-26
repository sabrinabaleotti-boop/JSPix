import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { PageHeader } from "@/components/admin/page-header";
import { RecipientForm } from "@/components/admin/recipient-form";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Novo recebedor" };

export default async function NovoRecebedorPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Novo recebedor" description="Cadastro direto na Pagar.me com os dados exigidos pelo contrato KYC.">
        <Link href="/admin/configuracoes/recebedores">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>
      </PageHeader>
      <RecipientForm />
    </div>
  );
}
