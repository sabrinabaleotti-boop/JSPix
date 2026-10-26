import { Banknote, ShieldCheck, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Zap, title: "Confirmação em tempo real", text: "O status do Pix muda sozinho assim que o pagamento cai." },
  { icon: ShieldCheck, title: "Segurança de ponta a ponta", text: "Chaves cifradas, sessões protegidas e auditoria de cada evento." },
  { icon: Banknote, title: "Saque quando quiser", text: "Transfira o saldo para a conta e acompanhe cada etapa." },
];

export function AuthShell({ title, description, children, footer }: { title: string; description: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="mesh relative hidden overflow-hidden gradient-hero p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl animate-float [animation-delay:2s]" />
        <div className="relative animate-fade-up">
          <Logo light />
        </div>
        <div className="relative max-w-md space-y-8">
          <div className="animate-fade-up [animation-delay:100ms]">
            <h2 className="text-4xl font-bold leading-tight tracking-tight">
              Receba por Pix
              <br />
              com velocidade e confiança.
            </h2>
            <p className="mt-3 text-base text-white/80">Gere cobranças, acompanhe pagamentos em tempo real e saque quando quiser. Tudo em um só lugar.</p>
          </div>
          <ul className="space-y-4 stagger">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-white/75">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} JSPix · Pagamentos Pix</p>
      </aside>

      <div className="relative flex flex-col bg-grid">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        <header className="relative flex h-16 items-center justify-between px-4 md:px-6">
          <span className="lg:invisible">
            <Logo />
          </span>
          <ThemeToggle />
        </header>
        <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
          <Card className="w-full max-w-sm animate-scale-in shadow-[0_24px_60px_-24px_rgb(15_23_42/0.35)]">
            <CardContent className="p-6 sm:p-8">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              {children}
              {footer && <div className="mt-5 text-center text-xs text-muted-foreground">{footer}</div>}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
