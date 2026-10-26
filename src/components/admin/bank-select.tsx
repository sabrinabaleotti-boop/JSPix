"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BANKS, bankLabel, normalize } from "@/lib/banks";
import { cn } from "@/lib/utils";

/** Seletor de banco com busca por nome ou código. Envia só o código (campo `name`). */
export function BankSelect({ name, id }: { name: string; id: string }) {
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return BANKS.slice(0, 27);
    const digits = q.replace(/\D/g, "");
    return BANKS.filter((b) => normalize(b.name).includes(q) || (digits && (b.code.startsWith(digits) || b.code === digits.padStart(3, "0")))).slice(0, 50);
  }, [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(c: string) {
    setCode(c);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={code} />
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-input px-3 text-left text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary",
          !code && "text-muted-foreground",
        )}
      >
        <span className="truncate">{code ? bankLabel(code) : "Selecione o banco"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[active]) pick(results[active].code);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Buscar por nome ou código (ex.: nubank, 341)"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox">
            {!query && <li className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Mais usados</li>}
            {results.map((b, i) => (
              <li key={b.code} role="option" aria-selected={b.code === code}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(b.code)}
                  className={cn("flex w-full items-center gap-3 px-3 py-2 text-left text-sm", i === active && "bg-accent")}
                >
                  <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">{b.code}</span>
                  <span className="flex-1 truncate">{b.name}</span>
                  {b.code === code && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Nenhum banco encontrado.</li>}
          </ul>
          {!query && <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">Digite para buscar entre todas as instituições do Banco Central.</p>}
        </div>
      )}
    </div>
  );
}
