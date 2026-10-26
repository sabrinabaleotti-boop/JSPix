import { requireAdmin } from "@/lib/admin";
import { AdminForm } from "@/components/admin/form";
import { ClientFields } from "@/components/admin/client-fields";
import { PageHeader } from "@/components/admin/page-header";
import { clientFormDefaults } from "@/lib/client-defaults";
import { saveClient } from "@/app/admin/actions";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage() {
  await requireAdmin();
  const defaults = await clientFormDefaults();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Novo cliente" description="O cliente entra no painel só com o código de acesso." />
      <AdminForm action={saveClient} submitLabel="Criar cliente">
        <ClientFields defaults={defaults} />
      </AdminForm>
    </div>
  );
}
