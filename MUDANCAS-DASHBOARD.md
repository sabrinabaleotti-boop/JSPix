# Mudancas no Dashboard e Saque - Guia para MJPix

Este documento descreve as alteracoes feitas no JSPix que devem ser replicadas no MJPix.
Os dois projetos tem a mesma estrutura, entao os caminhos dos arquivos sao iguais.

---

## 1. Saque restrito ao recebedor responsavel do split

**Problema:** Qualquer recebedor configurado na Pagar.me aparecia na tela de saque.
O correto e mostrar apenas o recebedor marcado como `responsible` no split.

**Arquivo:** `src/lib/withdraw.ts`

### Em `loadWithdrawRecipients()`

Adicionar no inicio da funcao, depois de `const list = await listRecipientsCached()`:

```ts
const splitDefault = await getSplitDefault();
const responsibleId = splitDefault.enabled
  ? splitDefault.rules.find((r) => r.responsible)?.recipientId
  : null;

const filteredList = responsibleId
  ? list.filter((r) => r.id === responsibleId)
  : list;
```

E trocar o `list.map(...)` por `filteredList.map(...)` no `Promise.all`.

### Em `withdraw()`

Adicionar **antes** da validacao de saldo (antes do `try`):

```ts
const splitDefault = await getSplitDefault();
if (splitDefault.enabled) {
  const responsibleId = splitDefault.rules.find((r) => r.responsible)?.recipientId;
  if (responsibleId && recipientId !== responsibleId) {
    return { error: "Apenas o recebedor responsavel pode fazer saques." };
  }
}
```

**Import necessario** (se ainda nao existir):

```ts
import { getSplitDefault } from "@/lib/split";
```

> A funcao `getSplitDefault()` ja existe em `src/lib/split.ts` e retorna
> `{ enabled: boolean; rules: SplitRule[] }` lendo a configuracao global de settings.

---

## 2. Seletor de periodo no dashboard (estilo AtivoPay)

**Problema:** O dashboard mostrava o saldo de "todo o periodo", mas todo dia zera.
O correto e ter um dropdown de periodo (Hoje, Ontem, 7d, 30d, 6m, 1a, Tudo) que
filtra **todas** as metricas da pagina.

### 2a. Criar `src/components/period-selector.tsx` (arquivo novo)

```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const PERIODS = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "7d", label: "Ultimos 7 dias" },
  { key: "30d", label: "Ultimos 30 dias" },
  { key: "6m", label: "Ultimos 6 meses" },
  { key: "1a", label: "Ultimo ano" },
  { key: "tudo", label: "Todo o periodo" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];
export const DEFAULT_PERIOD: PeriodKey = "7d";

export function periodLabel(key: string): string {
  return (
    PERIODS.find((p) => p.key === key)?.label ??
    PERIODS.find((p) => p.key === DEFAULT_PERIOD)!.label
  );
}

export function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = (sp.get("periodo") as PeriodKey) || DEFAULT_PERIOD;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(key: PeriodKey) {
    setOpen(false);
    const params = new URLSearchParams(sp.toString());
    if (key === DEFAULT_PERIOD) params.delete("periodo");
    else params.set("periodo", key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-accent"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{periodLabel(current)}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-border bg-secondary shadow-[0_10px_40px_-8px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.08] animate-fade-up">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => pick(p.key)}
              className={cn(
                "flex w-full items-center px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                current === p.key && "bg-primary/8 font-semibold text-primary",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2b. Adicionar `periodFromParam()` em `src/lib/charges.ts`

Adicionar no final do arquivo:

```ts
export function periodFromParam(
  key: string | null | undefined,
): { since: Date; prevSince: Date; label: string; days: number } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = (d: number) => d * 86400000;

  switch (key) {
    case "hoje":
      return {
        since: startOfDay,
        prevSince: new Date(startOfDay.getTime() - ms(1)),
        label: "Hoje",
        days: 1,
      };
    case "ontem": {
      const yesterday = new Date(startOfDay.getTime() - ms(1));
      return {
        since: yesterday,
        prevSince: new Date(yesterday.getTime() - ms(1)),
        label: "Ontem",
        days: 1,
      };
    }
    case "30d":
      return {
        since: new Date(now.getTime() - ms(30)),
        prevSince: new Date(now.getTime() - ms(60)),
        label: "Ultimos 30 dias",
        days: 30,
      };
    case "6m":
      return {
        since: new Date(now.getTime() - ms(180)),
        prevSince: new Date(now.getTime() - ms(360)),
        label: "Ultimos 6 meses",
        days: 180,
      };
    case "1a":
      return {
        since: new Date(now.getTime() - ms(365)),
        prevSince: new Date(now.getTime() - ms(730)),
        label: "Ultimo ano",
        days: 365,
      };
    case "tudo":
      return {
        since: new Date(0),
        prevSince: new Date(0),
        label: "Todo o periodo",
        days: 0,
      };
    default: // "7d" ou sem parametro
      return {
        since: new Date(now.getTime() - ms(7)),
        prevSince: new Date(now.getTime() - ms(14)),
        label: "Ultimos 7 dias",
        days: 7,
      };
  }
}
```

### 2c. Modificar `src/app/app/page.tsx`

As mudancas necessarias sao:

1. **Importar** os novos modulos:

```ts
import { Suspense } from "react";
import { PeriodSelector, periodLabel } from "@/components/period-selector";
import { gatewayFeeOf, periodFromParam, serializeCharge } from "@/lib/charges";
import { getSplitDefault } from "@/lib/split";
```

2. **Aceitar searchParams** na assinatura do componente:

```ts
// ANTES:
export default async function AppHome() {

// DEPOIS:
export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
```

> **Importante (Next.js 16):** `searchParams` e uma `Promise`. Precisa fazer `await`.

3. **Resolver o periodo** no inicio da funcao:

```ts
const sp = await searchParams;
const periodoKey = typeof sp.periodo === "string" ? sp.periodo : undefined;
const { since, prevSince, label: periodLbl, days } = periodFromParam(periodoKey);
```

4. **Filtrar queries por periodo** (substituir `periodBounds(7)`):

```ts
const periodWhere = days > 0 ? { createdAt: { gte: since } } : {};
const prevWhere = days > 0
  ? { createdAt: { gte: prevSince, lt: since } }
  : {};
```

5. **Filtrar historico de saques pelo responsavel do split:**

```ts
const splitDefault = await getSplitDefault();
const responsibleId = splitDefault.enabled
  ? splitDefault.rules.find((r) => r.responsible)?.recipientId
  : null;

const withdrawalWhere = {
  ...withdrawalScope(clientId),
  ...(responsibleId ? { recipientId: responsibleId } : {}),
};
```

6. **Usar `withdrawalWhere`** nas queries de saque e **`periodWhere`/`prevWhere`** nas de cobranca.

7. **Delta so aparece quando `days > 0`** (nao faz sentido para "Todo o periodo"):

```ts
const delta =
  days > 0 && prevGross > 0
    ? ((gross - prevGross) / prevGross) * 100
    : gross > 0 && days > 0
      ? 100
      : undefined;
```

8. **Renderizar o PeriodSelector** dentro do PageHeader:

```tsx
<PageHeader eyebrow="Painel" title={...} description={...}>
  <div className="flex items-center gap-3">
    <Suspense>
      <PeriodSelector />
    </Suspense>
    <Link href="/app/gerar">
      <Button>Gerar Pix</Button>
    </Link>
  </div>
</PageHeader>
```

9. **Hero card** mostrar `Faturamento * {periodLbl}` em vez de "Saldo recebido".

### 2d. Adicionar `relative z-30` ao `PageHeader`

Em `src/components/admin/page-header.tsx`, adicionar `relative z-30` ao wrapper
para que o dropdown do seletor de periodo fique acima do hero card:

```tsx
// ANTES:
<div className={cn("flex flex-col gap-3 animate-fade-up sm:flex-row sm:items-end sm:justify-between", className)}>

// DEPOIS:
<div className={cn("relative z-30 flex flex-col gap-3 animate-fade-up sm:flex-row sm:items-end sm:justify-between", className)}>
```

---

## Resumo dos arquivos alterados

| Arquivo | Acao |
|---------|------|
| `src/lib/withdraw.ts` | Filtrar recebedores e validar saque pelo split `responsible` |
| `src/components/period-selector.tsx` | **Criar** - dropdown de periodo |
| `src/lib/charges.ts` | Adicionar `periodFromParam()` |
| `src/app/app/page.tsx` | Reescrever com filtro de periodo + saques do split |
| `src/components/admin/page-header.tsx` | Adicionar `relative z-30` ao wrapper |

## Dependencias

- `lucide-react` (Calendar, ChevronDown) - ja existe no projeto
- `getSplitDefault()` de `src/lib/split.ts` - ja existe no projeto
- `withdrawalScope()` de `src/lib/withdraw.ts` - ja existe no projeto
