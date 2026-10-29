"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const PERIODS = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "6m", label: "Últimos 6 meses" },
  { key: "1a", label: "Último ano" },
  { key: "tudo", label: "Todo o período" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"];
export const DEFAULT_PERIOD: PeriodKey = "7d";

export function periodLabel(key: string): string {
  return PERIODS.find((p) => p.key === key)?.label ?? PERIODS.find((p) => p.key === DEFAULT_PERIOD)!.label;
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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
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
