import { AdminForm } from "@/components/admin/form";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";
import { changePassword } from "@/app/admin/actions";

export const metadata = { title: "Segurança" };

export default async function SegurancaPage() {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader title="Segurança" description={`Conta ${admin.email}`} />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Trocar senha</CardTitle>
            <CardDescription>Mínimo de 10 caracteres.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <AdminForm action={changePassword} submitLabel="Trocar senha">
            <div>
              <Label htmlFor="current">Senha atual</Label>
              <Input id="current" name="current" type="password" autoComplete="current-password" required />
            </div>
            <div>
              <Label htmlFor="next">Nova senha</Label>
              <Input id="next" name="next" type="password" autoComplete="new-password" required />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar nova senha</Label>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
            </div>
          </AdminForm>
        </CardContent>
      </Card>
    </div>
  );
}
