"use client";

import { Equal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SplitRule } from "@/lib/split";

export type RecipientOption = { id: string; name: string; document: string | null; status: string | null };

type Row = SplitRule & { document: string | null; status: string | null; missing: boolean };

// Uma linha por recebedor da conta; quem não estava no split salvo começa com 0% (fora do split).
function buildRows(recipients: RecipientOption[], initial: SplitRule[]): Row[] {
  const saved = new Map(initial.map((r) => [r.recipientId, r]));
  const rows: Row[] = recipients.map((r) => {
    const s = saved.get(r.id);
    return { recipientId: r.id, name: r.name, percent: s?.percent ?? 0, responsible: s?.responsible ?? false, document: r.document, status: r.status, missing: false };
  });
  const known = new Set(recipients.map((r) => r.id));
  for (const s of initial) if (s.recipientId && !known.has(s.recipientId)) rows.push({ ...s, document: null, status: null, missing: true });
  if (!initial.length && rows.length === 1) rows[0] = { ...rows[0], percent: 100, responsible: true };
  return rows;
}

// Só quem tem mais de 0% entra no split; se o responsável marcado ficou de fora, o primeiro incluído assume.
function toRules(rows: Row[]): SplitRule[] {
  const included = rows.filter((r) => r.percent > 0);
  const hasResponsible = included.some((r) => r.responsible);
  return included.map((r, i) => ({ recipientId: r.recipientId, name: r.name, percent: r.percent, responsible: hasResponsible ? r.responsible : i === 0 }));
}

export function SplitEditor({ recipients, initial, name = "rules" }: { recipients: RecipientOption[]; initial: SplitRule[]; name?: string }) {
  const [rows, setRows] = useState<Row[]>(() => buildRows(recipients, initial));

  const rules = toRules(rows);
  const total = rules.reduce((s, r) => s + r.percent, 0);
  const responsibleId = rules.find((r) => r.responsible)?.recipientId;

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function equalize() {
    setRows((rs) => {
      const targets = rs.some((r) => r.percent > 0) ? rs.map((r) => r.percent > 0) : rs.map(() => true);
      const n = targets.filter(Boolean).length;
      const base = Math.floor(100 / n);
      let extra = 100 - base * n;
      return rs.map((r, i) => (targets[i] ? { ...r, percent: base + (extra-- > 0 ? 1 : 0) } : r));
    });
  }

  function giveAllTo(i: number) {
    setRows((rs) => rs.map((r, j) => ({ ...r, percent: j === i ? 100 : 0, responsible: j === i })));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rules)} />

      {rows.length === 0 && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum recebedor cadastrado na conta.</p>}

      {rows.map((r, i) => {
        const off = r.percent <= 0;
        return (
          <div key={r.recipientId} className={cn("grid grid-cols-[1fr_5.5rem] items-center gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto_5.5rem_auto]", off && "opacity-60")}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.missing ? "Não encontrado na conta" : r.document}
                {r.status && r.status !== "active" && <span className="text-warning"> · {r.status}</span>}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" className="hidden h-8 px-2 text-xs sm:inline-flex" onClick={() => giveAllTo(i)}>
              100%
            </Button>
            <div className="relative">
              <Input
                aria-label={`Porcentagem de ${r.name}`}
                inputMode="numeric"
                value={String(r.percent)}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => update(i, { percent: Math.min(100, Number(e.target.value.replace(/\D/g, "").slice(0, 3)) || 0) })}
                className="pr-7 text-right tabular"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <label
              className={cn("col-span-2 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground sm:col-span-1", off && "pointer-events-none")}
              title="Paga as taxas da transação, responde por chargeback e recebe o restante dos centavos"
            >
              <input
                type="radio"
                disabled={off}
                checked={!off && r.recipientId === responsibleId}
                onChange={() => setRows((rs) => rs.map((x, j) => ({ ...x, responsible: j === i })))}
                className="accent-[rgb(var(--primary))]"
              />
              Responsável
            </label>
          </div>
        );
      })}

      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {rows.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={equalize}>
                  <Equal className="h-4 w-4" /> Dividir igualmente
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full transition-all", total === 100 ? "bg-success" : total > 100 ? "bg-destructive" : "bg-warning")} style={{ width: `${Math.min(total, 100)}%` }} />
              </div>
              <span className={cn("text-sm font-semibold tabular", total === 100 ? "text-success" : total > 100 ? "text-destructive" : "text-warning")}>
                {total}% {total === 100 ? "✓" : total > 100 ? `(${total - 100}% a mais)` : `(faltam ${100 - total}%)`}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Recebedor com 0% fica fora do split. O responsável paga as taxas da transação, responde por chargeback e recebe os centavos que sobram da divisão.
          </p>
        </>
      )}
    </div>
  );
}
