"use client";

import { useState } from "react";
import { AdminForm } from "@/components/admin/form";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createPayout } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string; balanceCents: number; pixKey: string | null; pixKeyType: string | null };

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PayoutForm({ clients, initialClientId, legacyReady, today }: { clients: Opt[]; initialClientId?: string; legacyReady: boolean; today: string }) {
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [method, setMethod] = useState<"manual" | "legacy">("manual");
  const client = clients.find((c) => c.id === clientId);
  const [amount, setAmount] = useState(client && client.balanceCents > 0 ? (client.balanceCents / 100).toFixed(2).replace(".", ",") : "");

  const canPix = legacyReady && !!client?.pixKey && !!client?.pixKeyType;

  return (
    <AdminForm action={createPayout} submitLabel={method === "legacy" ? "Enviar Pix" : "Registrar repasse"}>
      <input type="hidden" name="method" value={method} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="clientId">Cliente</Label>
          <Select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => {
              const c = clients.find((x) => x.id === e.target.value);
              setClientId(e.target.value);
              setAmount(c && c.balanceCents > 0 ? (c.balanceCents / 100).toFixed(2).replace(".", ",") : "");
              if (!(legacyReady && c?.pixKey && c?.pixKeyType)) setMethod("manual");
            }}
            required
          >
            <option value="">Escolha…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · saldo {brl(c.balanceCents)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input id="amount" name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
        </div>
      </div>

      <div>
        <Label>Como foi pago</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["manual", "Registrar repasse feito", "Você já fez o Pix por fora e só quer registrar."],
              ["legacy", "Enviar Pix pela Legacy", canPix ? `Para a chave ${client?.pixKey} (${client?.pixKeyType})` : legacyReady ? "Cadastre a chave Pix de repasse no cliente" : "Configure a Legacy para usar"],
            ] as const
          ).map(([value, title, hint]) => {
            const disabled = value === "legacy" && !canPix;
            return (
              <button
                type="button"
                key={value}
                disabled={disabled}
                onClick={() => setMethod(value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  method === value ? "border-primary bg-primary/5" : "hover:bg-accent",
                )}
              >
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {method === "manual" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="paidAt">Data do repasse</Label>
            <Input id="paidAt" name="paidAt" type="date" defaultValue={today} />
          </div>
          <div>
            <Label htmlFor="receiptUrl">Link do comprovante (opcional)</Label>
            <Input id="receiptUrl" name="receiptUrl" type="url" placeholder="https://..." />
          </div>
        </div>
      ) : (
        <label className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]" />
          <span>
            Confirmo o envio de <strong>{amount ? `R$ ${amount}` : "—"}</strong> do saldo da Legacy para a chave <strong className="font-mono">{client?.pixKey}</strong>. O
            dinheiro sai na hora e não dá para desfazer pelo JSPix.
          </span>
        </label>
      )}

      <div>
        <Label htmlFor="note">Observação (opcional)</Label>
        <Input id="note" name="note" maxLength={200} />
      </div>
    </AdminForm>
  );
}
