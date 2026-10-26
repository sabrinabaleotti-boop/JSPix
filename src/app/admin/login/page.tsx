import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { AdminForm } from "@/components/admin/form";
import { Input, Label } from "@/components/ui/input";
import { getAdminId } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminLogin } from "@/app/admin/actions";

export const metadata = { title: "Admin" };

export default async function AdminLoginPage() {
  // Só redireciona se o admin do cookie ainda existe; senão um cookie antigo causaria loop com o painel.
  const adminId = await getAdminId();
  if (adminId && (await db.admin.findUnique({ where: { id: adminId }, select: { id: true } }))) redirect("/admin");

  return (
    <AuthShell title="Painel administrativo" description="Entre com seu e-mail e senha." footer="Acesso restrito à equipe JSPix.">
      <AdminForm action={adminLogin} submitLabel="Entrar" className="mt-6 [&>button]:w-full [&>button]:h-12">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
      </AdminForm>
    </AuthShell>
  );
}
