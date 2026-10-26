import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getClientId } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function LoginPage() {
  // Só redireciona se o cliente do cookie ainda existe e está ativo; senão um cookie antigo causaria loop com o painel.
  const clientId = await getClientId();
  if (clientId && (await db.client.findFirst({ where: { id: clientId, active: true }, select: { id: true } }))) redirect("/app");

  return (
    <AuthShell
      title="Acessar painel"
      description="Digite o código de acesso que você recebeu."
      footer={
        <>
          Não tem um código?{" "}
          <Link href="#" className="font-semibold text-primary hover:underline">
            Fale com o suporte
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
