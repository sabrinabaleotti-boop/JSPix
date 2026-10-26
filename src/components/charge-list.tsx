import { Ban, Check, ChevronRight, Clock, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ChargeDTO } from "@/lib/charges";
import { maskBRL } from "@/lib/masks";
import { cn } from "@/lib/utils";

export const statusMeta = {
  pending: { label: "Pendente", variant: "warning" as const },
  paid: { label: "Pago", variant: "success" as const },
  expired: { label: "Expirado", variant: "neutral" as const },
  canceled: { label: "Cancelado", variant: "destructive" as const },
  failed: { label: "Falhou", variant: "destructive" as const },
  refunded: { label: "Estornado", variant: "neutral" as const },
};

const icon = {
  pending: { icon: Clock, className: "bg-warning/12 text-warning" },
  paid: { icon: Check, className: "bg-success/12 text-success" },
  expired: { icon: Ban, className: "bg-muted text-muted-foreground" },
  canceled: { icon: XCircle, className: "bg-destructive/12 text-destructive" },
  failed: { icon: XCircle, className: "bg-destructive/12 text-destructive" },
  refunded: { icon: RotateCcw, className: "bg-muted text-muted-foreground" },
};

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Hoje, ${time}` : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${time}`;
}

function leftLabel(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

export function ChargeList({ items, empty = "Nenhuma cobrança ainda." }: { items: ChargeDTO[]; empty?: string }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Clock className="h-5 w-5" />
        </span>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <ul className="divide-y stagger">
      {items.map((c) => {
        const m = statusMeta[c.status];
        const ic = icon[c.status];
        const left = c.status === "pending" ? leftLabel(c.expiresAt) : null;
        return (
          <li key={c.id}>
            <Link href={`/app/pix/${c.id}`} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-accent/60">
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105", ic.className)}>
                <ic.icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.description || "Sem descrição"}</p>
                <p className="text-xs text-muted-foreground">{when(c.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-bold tabular">{maskBRL(c.amountCents)}</span>
                {c.status === "paid" && c.netCents !== undefined && c.netCents !== c.amountCents && (
                  <span className="text-[11px] text-muted-foreground tabular">Líquido {maskBRL(c.netCents)}</span>
                )}
                <span className="flex items-center gap-1.5">
                  {left && <span className="font-mono text-[11px] text-warning tabular">{left}</span>}
                  <Badge variant={m.variant} dot pulse={c.status === "pending"}>
                    {m.label}
                  </Badge>
                </span>
              </div>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:block" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
