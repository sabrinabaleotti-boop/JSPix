"use client";

import { Loader2, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { maskBRL, parseBRLToCents } from "@/lib/masks";
import { cn } from "@/lib/utils";

export function ChargeForm({
  defaultExpiryMin,
  minAmountCents,
  allowExpiry = true,
}: {
  defaultExpiryMin: number;
  minAmountCents: number;
  /** false quando a gateway define a validade do Pix sozinha (Legacy). */
  allowExpiry?: boolean;
}) {
  const router = useRouter();
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState("");
  const [expiry, setExpiry] = useState(defaultExpiryMin);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = cents >= minAmountCents && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: cents,
        description,
        expiresInMin: expiry,
        // Nunca envia dados do pagador — sempre usa pool de teste
        payer: undefined,
      }),
    }).catch(() => null);
    if (!res) {
      setLoading(false);
      setError("Sem conexão. Tente de novo.");
      return;
    }
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(j.error ?? "Falha ao gerar o Pix");
      return;
    }
    router.push(`/app/pix/${j.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              inputMode="numeric"
              autoFocus
              value={cents ? maskBRL(cents) : ""}
              onChange={(e) => setCents(parseBRLToCents(e.target.value))}
              placeholder="R$ 0,00"
              className="h-16 text-3xl font-bold tabular"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {[1000, 2500, 5000, 10000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCents(v)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    cents === v ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:border-primary/50 hover:text-primary",
                  )}
                >
                  {maskBRL(v)}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-muted-foreground">Mínimo {maskBRL(minAmountCents)}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descrição <span className="font-normal">(opcional)</span></Label>
            <Input
              id="description"
              value={description}
              maxLength={100}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Pedido #1042"
            />
          </div>

          <div className={allowExpiry ? "" : "hidden"}>
            <Label>Expira em</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                [15, "15 min"],
                [30, "30 min"],
                [60, "1 hora"],
                [1440, "24 h"],
              ].map(([v, label]) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setExpiry(Number(v))}
                  className={cn(
                    "h-10 rounded-xl border text-sm font-semibold transition-all duration-200 press",
                    expiry === v ? "border-primary gradient-primary text-white shadow-primary" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pagador</CardTitle>
            <CardDescription>Dados preenchidos automaticamente a cada cobrança.</CardDescription>
          </div>
        </CardHeader>
      </Card>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-up">{error}</p>}

      <Button size="lg" className="w-full" disabled={!canSubmit}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
        {loading ? "Gerando..." : `Gerar Pix${cents ? ` de ${maskBRL(cents)}` : ""}`}
      </Button>
    </form>
  );
}
