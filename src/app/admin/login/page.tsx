import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminForm } from "@/components/admin/form";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between px-4 md:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-[22px] font-semibold tracking-tight">Painel administrativo</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Entre com seu e-mail e senha.</p>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
