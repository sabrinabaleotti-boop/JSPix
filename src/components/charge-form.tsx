"use client";

import { ChevronDown, Loader2, Pencil, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hideCpf, isValidCpf, maskBRL, maskCpf, maskPhone, onlyDigits, parseBRLToCents } from "@/lib/masks";
import { cn } from "@/lib/utils";

type Payer = { name: string; cpf: string; email: string; phone: string };

export function ChargeForm({
  defaultPayer,
  defaultExpiryMin,
  minAmountCents,
  allowExpiry = true,
}: {
  defaultPayer: Payer;
  defaultExpiryMin: number;
  minAmountCents: number;
  /** false quando a gateway define a validade do Pix sozinha (Legacy). */
  allowExpiry?: boolean;
}) {
  const router = useRouter();
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState("");
  const [expiry, setExpiry] = useState(defaultExpiryMin);
  const [editPayer, setEditPayer] = useState(false);
  const [payer, setPayer] = useState<Payer>({
    ...defaultPayer,
    cpf: maskCpf(defaultPayer.cpf),
    phone: maskPhone(defaultPayer.phone),
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cpfOk = isValidCpf(payer.cpf);
  const canSubmit = cents >= minAmountCents && (!editPayer || (cpfOk && payer.name.trim().length >= 3)) && !loading;

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
        payer: editPayer ? { ...payer, cpf: onlyDigits(payer.cpf), phone: onlyDigits(payer.phone) } : undefined,
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
            <CardDescription>
              {editPayer
                ? "Edite os dados que irão na cobrança."
                : payer.name
                  ? `${payer.name} · CPF ${hideCpf(payer.cpf)}`
                  : "Preenchido automaticamente a cada cobrança."}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditPayer((v) => !v)}>
            {editPayer ? <ChevronDown className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
            {editPayer ? "Recolher" : "Editar dados"}
          </Button>
        </CardHeader>
        {editPayer && (
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="pname">Nome completo</Label>
              <Input id="pname" value={payer.name} onChange={(e) => setPayer({ ...payer, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pcpf">CPF</Label>
              <Input
                id="pcpf"
                inputMode="numeric"
                value={payer.cpf}
                onChange={(e) => setPayer({ ...payer, cpf: maskCpf(e.target.value) })}
                className="font-mono"
                aria-invalid={payer.cpf.length === 14 && !cpfOk}
              />
              {payer.cpf.length === 14 && !cpfOk && <p className="mt-1 text-xs text-destructive">CPF inválido</p>}
            </div>
            <div>
              <Label htmlFor="pphone">Telefone</Label>
              <Input
                id="pphone"
                inputMode="tel"
                value={payer.phone}
                onChange={(e) => setPayer({ ...payer, phone: maskPhone(e.target.value) })}
                className="font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="pemail">E-mail</Label>
              <Input id="pemail" type="email" value={payer.email} onChange={(e) => setPayer({ ...payer, email: e.target.value })} />
            </div>
          </CardContent>
        )}
        {!editPayer && <div className="pb-5" />}
      </Card>

      {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-up">{error}</p>}

      <Button size="lg" className="w-full" disabled={!canSubmit}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
        {loading ? "Gerando..." : `Gerar Pix${cents ? ` de ${maskBRL(cents)}` : ""}`}
      </Button>
    </form>
  );
}
