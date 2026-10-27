import Link from "next/link";
import { ArrowRight, Banknote, CheckCircle2, QrCode, Share2, ShieldCheck, Zap } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Como funciona" };

const steps = [
  { icon: QrCode, title: "Gere o Pix", text: "Informe o valor e, se quiser, uma descrição. O QR Code e o código copia-e-cola ficam prontos na hora." },
  { icon: Share2, title: "Compartilhe", text: "Envie o código para quem vai pagar. Funciona em qualquer banco, 24 horas por dia." },
  { icon: Zap, title: "Receba na hora", text: "Assim que o pagamento cai, o status muda para Pago sozinho e o valor entra no seu saldo." },
  { icon: Banknote, title: "Saque quando quiser", text: "Transfira o saldo disponível para a sua conta bancária e acompanhe cada saque no histórico." },
];

const faq = [
  { q: "Quanto tempo o Pix fica válido?", a: "Você escolhe ao gerar: 15 minutos, 30 minutos, 1 hora ou 24 horas. Depois disso ele expira e é preciso gerar outro." },
  { q: "Como sei que fui pago?", a: "A tela do Pix atualiza sozinha e o status muda para Pago. A cobrança também aparece como paga no histórico e na visão geral." },
  { q: "Quanto tempo leva o saque?", a: "Normalmente cai em até 1 dia útil. Enquanto isso você acompanha o andamento em Sacar → Histórico de saques." },
  { q: "Posso cancelar um saque?", a: "Não. Depois de confirmado, o saque é enviado ao banco e não pode ser desfeito. Confira o valor antes de confirmar." },
];

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="Ajuda" title="Como funciona" description="Do Pix gerado ao dinheiro na conta, em quatro passos." />

      <div className="grid gap-4 stagger sm:grid-cols-2">
        {steps.map((s, i) => (
          <Card key={s.title} className="card-hover relative overflow-hidden p-5">
            <span className="absolute right-4 top-3 text-5xl font-black text-primary/8">{i + 1}</span>
            <span className="grid h-11 w-11 place-items-center rounded-xl gradient-primary text-white shadow-primary">
              <s.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-base font-semibold">{s.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </Card>
        ))}
      </div>

      <Card className="mesh shine border-transparent text-white gradient-hero animate-fade-up [animation-delay:200ms]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/18 ring-1 ring-white/25">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Pagamentos protegidos</p>
              <p className="text-sm text-white/80">Cada Pix é processado por uma instituição autorizada pelo Banco Central e confirmado em tempo real.</p>
            </div>
          </div>
          <Link href="/app/gerar" className="shrink-0">
            <Button variant="white">
              Gerar meu primeiro Pix <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="animate-fade-up [animation-delay:260ms]">
        <h2 className="mb-3 text-lg font-bold tracking-tight">Perguntas frequentes</h2>
        <Card className="divide-y overflow-hidden">
          {faq.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold transition-colors hover:bg-accent/50 [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-transform duration-300 group-open:rotate-45 group-open:bg-primary/10 group-open:text-primary">
                  +
                </span>
              </summary>
              <p className="flex items-start gap-2 px-5 pb-4 text-sm text-muted-foreground animate-fade-in">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {f.a}
              </p>
            </details>
          ))}
        </Card>
      </div>
    </div>
  );
}
