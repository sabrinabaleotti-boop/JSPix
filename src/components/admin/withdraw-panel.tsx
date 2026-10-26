"use client";

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseMoneyToCents } from "@/lib/money";
import { cn, formatBRL } from "@/lib/utils";
import type { WithdrawRecipient, WithdrawState } from "@/lib/withdraw";

type WithdrawAction = (recipientId: string, amountCents: number, idempotencyKey: string) => Promise<WithdrawState>;

const STATUS_LABEL: Record<string, string> = {
  pending_transfer: "Aguardando transferência",
  processing: "Processando",
  transferred: "Transferido",
  failed: "Falhou",
  canceled: "Cancelado",
};

export function WithdrawPanel({
  recipients,
  action,
  fee,
  showDocument = true,
}: {
  recipients: WithdrawRecipient[];
  action: WithdrawAction;
  /** Tarifa por saque em centavos: sai do saldo além do valor sacado. */
  fee: number;
  showDocument?: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<WithdrawRecipient | null>(null);
  const [amount, setAmount] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [result, setResult] = useState<WithdrawState | null>(null);
  const [pending, startTransition] = useTransition();

  const maxOf = (r: WithdrawRecipient) => Math.max(0, r.available - fee);
  const max = selected ? maxOf(selected) : 0;
  const cents = parseMoneyToCents(amount);
  const valid = selected && Number.isInteger(cents) && cents >= 1 && cents <= max;
  const amountError = !amount ? null : !Number.isInteger(cents) || cents < 1 ? "Valor inválido" : cents > max ? `Máximo ${formatBRL(max)}${fee ? " (saldo menos a tarifa)" : ""}` : null;

  function pick(r: WithdrawRecipient) {
    setSelected(r);
    setAmount("");
    setConfirmKey(null);
    setResult(null);
  }

  function back() {
    setSelected(null);
    setConfirmKey(null);
    setResult(null);
  }

  function submit() {
    if (!selected || !valid || !confirmKey) return;
    startTransition(async () => {
      const r = await action(selected.id, cents, confirmKey);
      setResult(r);
      if (r.transfer) router.refresh();
      // Libera o valor para correção; a próxima tentativa ganha uma Idempotency-Key nova.
      else setConfirmKey(null);
    });
  }

  if (recipients.length === 0) {
    return <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum recebedor cadastrado na conta.</p>;
  }

  if (!selected) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Escolha quem vai sacar.</p>
        {recipients.map((r) => {
          const off = maxOf(r) <= 0;
          return (
            <button
              key={r.id}
              type="button"
              disabled={off}
              onClick={() => pick(r)}
              className={cn("flex w-full items-center justify-between gap-4 rounded-lg border bg-card p-4 text-left transition-colors", off ? "cursor-not-allowed opacity-60" : "hover:border-primary hover:bg-primary/5")}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {showDocument && r.document}
                  {r.status && r.status !== "active" && <span className="text-warning"> · {r.status}</span>}
                </p>
                {r.balanceError && <p className="text-xs text-destructive">{r.balanceError}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-bold tabular">{formatBRL(r.available)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.available > 0 && off ? "menor que a tarifa" : r.waiting > 0 ? `+ ${formatBRL(r.waiting)} a liberar` : "disponível"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  if (result?.transfer) {
    const t = result.transfer;
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" />
            <p className="font-semibold">Saque solicitado</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Recebedor</dt>
            <dd>{selected.name}</dd>
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="tabular">{formatBRL(t.amount)}</dd>
            <dt className="text-muted-foreground">Tarifa</dt>
            <dd className="tabular">{t.fee != null ? formatBRL(t.fee) : "Não informada"}</dd>
            <dt className="text-muted-foreground">Situação</dt>
            <dd>{(t.status && STATUS_LABEL[t.status]) ?? t.status ?? "—"}</dd>
            {t.fundingEstimatedDate && (
              <>
                <dt className="text-muted-foreground">Previsão</dt>
                <dd>{new Date(t.fundingEstimatedDate).toLocaleDateString("pt-BR")}</dd>
              </>
            )}
            <dt className="text-muted-foreground">ID</dt>
            <dd className="font-mono text-xs">{t.id}</dd>
          </dl>
          <Button type="button" variant="outline" onClick={back}>
            Fazer outro saque
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <button type="button" onClick={back} disabled={pending} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Escolher outro recebedor
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{selected.name}</p>
            {showDocument && <p className="text-xs text-muted-foreground">{selected.document}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Disponível</p>
            <p className="text-lg font-bold tabular">{formatBRL(selected.available)}</p>
          </div>
        </div>

        <div>
          <label htmlFor="withdraw-amount" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Quanto quer sacar?
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                autoFocus
                placeholder="0,00"
                value={amount}
                disabled={pending || !!confirmKey}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
                className="pl-9 text-lg tabular"
              />
            </div>
            <Button type="button" variant="outline" disabled={pending || !!confirmKey} onClick={() => setAmount((max / 100).toFixed(2).replace(".", ","))}>
              Tudo
            </Button>
          </div>
          {amountError ? (
            <p className="mt-1 text-xs text-destructive">{amountError}</p>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">Máximo {formatBRL(max)}</p>
          )}
        </div>

        <div className="space-y-1.5 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {fee > 0 && (
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              <dt>Cai na conta</dt>
              <dd className="text-right font-semibold text-foreground tabular">{formatBRL(valid ? cents : 0)}</dd>
              <dt>Tarifa da Pagar.me</dt>
              <dd className="text-right tabular">{formatBRL(fee)}</dd>
              <dt>Sai do saldo</dt>
              <dd className="text-right tabular">{formatBRL(valid ? cents + fee : fee)}</dd>
            </dl>
          )}
          <p>O dinheiro vai para a conta bancária padrão cadastrada no recebedor.</p>
        </div>

        {result?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{result.error}</p>}

        {!confirmKey ? (
          <Button type="button" className="w-full" disabled={!valid} onClick={() => setConfirmKey(crypto.randomUUID())}>
            Sacar {valid ? formatBRL(cents) : ""}
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-primary/40 p-3">
            <p className="text-sm">
              Confirmar saque de <span className="font-semibold">{formatBRL(cents)}</span> para <span className="font-semibold">{selected.name}</span>?
            </p>
            <div className="flex gap-2">
              <Button type="button" className="flex-1" disabled={pending} onClick={submit}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirmar saque
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setConfirmKey(null);
                  setResult(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
