"use client";

import { Check, Copy, QrCode, Share2, CircleCheck, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ChargeDTO } from "@/lib/charges";
import { maskBRL } from "@/lib/masks";
import { cn } from "@/lib/utils";

const meta = {
  pending: { label: "Aguardando pagamento", variant: "warning" as const },
  paid: { label: "Pago", variant: "success" as const },
  expired: { label: "Expirado", variant: "neutral" as const },
  canceled: { label: "Cancelado", variant: "destructive" as const },
  failed: { label: "Falhou", variant: "destructive" as const },
  refunded: { label: "Estornado", variant: "neutral" as const },
};

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function PixView({ initial }: { initial: ChargeDTO }) {
  const [charge, setCharge] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  const expiresAt = new Date(charge.expiresAt).getTime();
  const createdAt = new Date(charge.createdAt).getTime();
  const total = Math.max(1, expiresAt - createdAt);
  const left = expiresAt - now;
  const pct = Math.min(100, Math.max(0, (left / total) * 100));
  const pending = charge.status === "pending" && left > 0;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (charge.status !== "pending") return;
    const poll = async () => {
      const res = await fetch(`/api/charges/${charge.id}`, { cache: "no-store" });
      if (res.ok) setCharge(await res.json());
    };
    const t = setInterval(poll, 5000);
    if (left <= 0) poll();
    return () => clearInterval(t);
  }, [charge.id, charge.status, left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  async function copy() {
    if (!charge.qrCode) return;
    await navigator.clipboard.writeText(charge.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (!charge.qrCode) return;
    if (navigator.share) {
      await navigator.share({ title: `Pix ${maskBRL(charge.amountCents)}`, text: charge.qrCode }).catch(() => {});
    } else {
      copy();
    }
  }

  const m = meta[charge.status];
  const barColor = charge.status === "paid" ? "bg-success" : !pending ? "bg-muted-foreground/40" : pct < 25 ? "bg-warning" : "bg-primary";

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className={cn("overflow-hidden transition-colors", charge.status === "paid" && "border-success/50")}>
        <div className={cn("h-1.5 w-full bg-muted")}>
          <div className={cn("h-full transition-all", barColor)} style={{ width: `${charge.status === "paid" ? 100 : pct}%` }} />
        </div>
        <CardContent className="space-y-5 text-center">
          <div className="flex items-center justify-between">
            <Badge variant={m.variant} className="text-xs">
              {charge.status === "paid" ? <CircleCheck className="h-3.5 w-3.5" /> : charge.status === "pending" ? <Clock className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {m.label}
            </Badge>
            {charge.simulated && <Badge variant="outline">Simulado</Badge>}
          </div>

          <div>
            <p className="text-xs text-muted-foreground">{charge.description || "Pagamento via Pix"}</p>
            <p className="mt-1 text-[34px] font-bold leading-none tracking-tight tabular">{maskBRL(charge.amountCents)}</p>
          </div>

          {charge.status === "paid" ? (
            <div className="grid place-items-center py-6">
              <span className="grid h-24 w-24 place-items-center rounded-full bg-success/15 text-success">
                <Check className="h-12 w-12" strokeWidth={3} />
              </span>
              <p className="mt-4 text-sm font-medium">Pagamento confirmado</p>
              {charge.paidAt && (
                <p className="text-xs text-muted-foreground">{new Date(charge.paidAt).toLocaleString("pt-BR")}</p>
              )}
              {charge.netCents !== undefined && charge.netCents !== charge.amountCents && (
                <div className="mt-3 rounded-md bg-muted px-4 py-2 text-center">
                  <p className="text-[11px] text-muted-foreground">Valor líquido (após taxa de {charge.feePercent.toFixed(0)}%)</p>
                  <p className="text-lg font-bold tabular">{maskBRL(charge.netCents)}</p>
                </div>
              )}
            </div>
          ) : (
            <div className={cn("mx-auto w-fit rounded-xl bg-white p-3", !pending && "opacity-40 grayscale")}>
              {charge.qrCode ? <QRCodeSVG value={charge.qrCode} size={208} level="M" /> : <QrCode className="h-52 w-52 text-muted" />}
            </div>
          )}

          {pending && (
            <p className="font-mono text-sm tabular text-muted-foreground">
              Expira em <span className={cn("font-semibold", pct < 25 ? "text-warning" : "text-foreground")}>{fmt(left)}</span>
            </p>
          )}
          {charge.status === "expired" && <p className="text-sm text-muted-foreground">Este Pix expirou. Gere uma nova cobrança.</p>}

          {pending && charge.qrCode && (
            <div className="space-y-2">
              <div className="rounded-md border bg-muted px-3 py-2 text-left font-mono text-[11px] leading-snug break-all text-muted-foreground">
                {charge.qrCode}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" onClick={copy} variant={copied ? "secondary" : "primary"}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar código"}
                </Button>
                <Button type="button" variant="outline" onClick={share}>
                  <Share2 className="h-4 w-4" /> Compartilhar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href="/app/gerar" className="flex-1">
          <Button variant="outline" className="w-full">Nova cobrança</Button>
        </Link>
        <Link href="/app/historico" className="flex-1">
          <Button variant="ghost" className="w-full">Ver histórico</Button>
        </Link>
      </div>

      {charge.simulated && pending && (
        <button
          type="button"
          className="w-full text-center text-xs text-muted-foreground underline"
          onClick={async () => {
            await fetch("/api/dev/simulate-paid", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: charge.id }) });
            const res = await fetch(`/api/charges/${charge.id}`, { cache: "no-store" });
            if (res.ok) setCharge(await res.json());
          }}
        >
          Simular pagamento (modo teste)
        </button>
      )}
    </div>
  );
}
