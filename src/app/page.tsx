import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { getClientId } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function LoginPage() {
  // Só redireciona se o cliente do cookie ainda existe e está ativo; senão um cookie antigo causaria loop com o painel.
  const clientId = await getClientId();
  if (clientId && (await db.client.findFirst({ where: { id: clientId, active: true }, select: { id: true } }))) redirect("/app");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between px-4 md:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-[22px] font-semibold tracking-tight">Acessar painel</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Digite o código de acesso que você recebeu.</p>
            <LoginForm />
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Não tem um código?{" "}
              <Link href="#" className="font-medium text-primary hover:underline">
                Fale com o suporte
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
