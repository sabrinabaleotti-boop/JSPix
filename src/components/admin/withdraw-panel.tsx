"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseMoneyToCents } from "@/lib/money";
import { cn, formatBRL } from "@/lib/utils";
import { WITHDRAWAL_STATUS, normalizeWithdrawalStatus, type WithdrawRecipient, type WithdrawState } from "@/lib/withdrawal-status";

type WithdrawAction = (recipientId: string, amountCents: number, idempotencyKey: string) => Promise<WithdrawState>;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function WithdrawPanel({
  recipients,
  action,
  fee,
  showDocument = true,
  historyHref,
}: {
  recipients: WithdrawRecipient[];
  action: WithdrawAction;
  /** Tarifa por saque em centavos: sai do saldo além do valor sacado. */
  fee: number;
  showDocument?: boolean;
  /** Link para o histórico mostrado depois do saque. */
  historyHref?: string;
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

  function setPercent(p: number) {
    setAmount((Math.floor((max * p) / 100) / 100).toFixed(2).replace(".", ","));
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
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Wallet className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">Nenhum recebedor cadastrado</p>
          <p className="max-w-xs text-xs text-muted-foreground">Cadastre um recebedor na conta para liberar os saques.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selected) {
    return (
      <div className="space-y-2.5 stagger">
        <p className="text-sm text-muted-foreground">Escolha de qual conta quer sacar.</p>
        {recipients.map((r) => {
          const off = maxOf(r) <= 0;
          return (
            <button
              key={r.id}
              type="button"
              disabled={off}
              onClick={() => pick(r)}
              className={cn(
                "group flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-card transition-all duration-200",
                off ? "cursor-not-allowed opacity-60" : "card-hover hover:border-primary/50",
              )}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-primary text-sm font-bold text-white shadow-primary">{initials(r.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {showDocument && r.document}
                  {r.status && r.status !== "active" && <span className="text-warning"> · {r.status}</span>}
                  {!showDocument &&
                    !r.balanceError &&
                    (r.available > 0 && off ? "Saldo menor que a tarifa" : r.waiting > 0 ? `${formatBRL(r.waiting)} a liberar` : r.available > 0 ? "Saldo disponível para saque" : "Sem saldo disponível")}
                </p>
                {r.balanceError && <p className="text-xs text-destructive">{r.balanceError}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-bold tabular">{formatBRL(r.available)}</p>
                <p className="text-[11px] text-muted-foreground">{r.available > 0 && off ? "menor que a tarifa" : r.waiting > 0 ? `+ ${formatBRL(r.waiting)} a liberar` : "disponível"}</p>
              </div>
              {!off && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />}
            </button>
          );
        })}
      </div>
    );
  }

  if (result?.transfer) {
    const t = result.transfer;
    const st = WITHDRAWAL_STATUS[normalizeWithdrawalStatus(t.status)];
    return (
      <Card className="animate-scale-in overflow-hidden">
        <div className="h-1.5 w-full bg-success" />
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col items-center text-center">
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-success/12 text-success">
              <span className="absolute inset-0 rounded-full bg-success/30 animate-pulse-ring" />
              <Check className="h-10 w-10 animate-pop" strokeWidth={3} />
            </span>
            <p className="mt-4 text-lg font-bold">Saque solicitado</p>
            <p className="text-sm text-muted-foreground">O valor está a caminho da conta bancária de {selected.name}.</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 rounded-xl bg-muted/50 p-4 text-sm">
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="text-right font-semibold tabular">{formatBRL(t.amount)}</dd>
            <dt className="text-muted-foreground">Tarifa</dt>
            <dd className="text-right tabular">{t.fee != null ? formatBRL(t.fee) : fee ? formatBRL(fee) : "Não informada"}</dd>
            <dt className="text-muted-foreground">Situação</dt>
            <dd className="text-right">{st.label}</dd>
            {t.fundingEstimatedDate && (
              <>
                <dt className="text-muted-foreground">Previsão</dt>
                <dd className="text-right">{new Date(t.fundingEstimatedDate).toLocaleDateString("pt-BR")}</dd>
              </>
            )}
            <dt className="text-muted-foreground">ID</dt>
            <dd className="truncate text-right font-mono text-xs">{t.id}</dd>
          </dl>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={back}>
              Fazer outro saque
            </Button>
            {historyHref && (
              <Link href={historyHref} className="flex-1">
                <Button type="button" className="w-full">
                  Ver histórico <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-up">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <button type="button" onClick={back} disabled={pending} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Escolher outra conta
        </button>

        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-primary text-sm font-bold text-white shadow-primary">{initials(selected.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{selected.name}</p>
            {showDocument && <p className="text-xs text-muted-foreground">{selected.document}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Disponível</p>
            <p className="text-lg font-bold tabular">{formatBRL(selected.available)}</p>
          </div>
        </div>

        <div>
          <label htmlFor="withdraw-amount" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Quanto quer sacar?
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">R$</span>
            <Input
              id="withdraw-amount"
              inputMode="decimal"
              autoFocus
              placeholder="0,00"
              value={amount}
              disabled={pending || !!confirmKey}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
              className="h-14 pl-11 text-2xl font-semibold tabular"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {[25, 50, 75].map((p) => (
              <button
                key={p}
                type="button"
                disabled={pending || !!confirmKey || max <= 0}
                onClick={() => setPercent(p)}
                className="rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                {p}%
              </button>
            ))}
            <button
              type="button"
              disabled={pending || !!confirmKey || max <= 0}
              onClick={() => setPercent(100)}
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
            >
              Tudo
            </button>
            <span className="ml-auto text-[11px] text-muted-foreground">{amountError ? <span className="text-destructive">{amountError}</span> : `Máximo ${formatBRL(max)}`}</span>
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          {fee > 0 && (
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
              <dt>Cai na conta</dt>
              <dd className="text-right font-semibold text-foreground tabular">{formatBRL(valid ? cents : 0)}</dd>
              <dt>Tarifa de saque</dt>
              <dd className="text-right tabular">{formatBRL(fee)}</dd>
              <dt className="border-t pt-1.5">Sai do saldo</dt>
              <dd className="border-t pt-1.5 text-right tabular">{formatBRL(valid ? cents + fee : fee)}</dd>
            </dl>
          )}
          <p className="flex items-start gap-1.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            O dinheiro vai para a conta bancária cadastrada no recebedor. Transferências são protegidas e não podem ser desfeitas.
          </p>
        </div>

        {result?.error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-up">{result.error}</p>}

        {!confirmKey ? (
          <Button type="button" size="lg" className="w-full" disabled={!valid} onClick={() => setConfirmKey(crypto.randomUUID())}>
            Sacar {valid ? formatBRL(cents) : ""} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 animate-scale-in">
            <p className="text-sm">
              Confirmar saque de <span className="font-bold">{formatBRL(cents)}</span> para <span className="font-semibold">{selected.name}</span>?
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
