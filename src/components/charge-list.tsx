import { QrCode } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ChargeDTO } from "@/lib/charges";
import { maskBRL } from "@/lib/masks";

export const statusMeta = {
  pending: { label: "Pendente", variant: "warning" as const },
  paid: { label: "Pago", variant: "success" as const },
  expired: { label: "Expirado", variant: "neutral" as const },
  canceled: { label: "Cancelado", variant: "destructive" as const },
  failed: { label: "Falhou", variant: "destructive" as const },
  refunded: { label: "Estornado", variant: "neutral" as const },
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
    return <p className="py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y">
      {items.map((c) => {
        const m = statusMeta[c.status];
        const left = c.status === "pending" ? leftLabel(c.expiresAt) : null;
        return (
          <li key={c.id}>
            <Link href={`/app/pix/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-accent/50">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <QrCode className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.description || "Sem descrição"}</p>
                <p className="text-xs text-muted-foreground">{when(c.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold tabular">{maskBRL(c.amountCents)}</span>
                {c.status === "paid" && c.netCents !== undefined && c.netCents !== c.amountCents && (
                  <span className="text-[11px] text-muted-foreground tabular">Líquido: {maskBRL(c.netCents)}</span>
                )}
                <span className="flex items-center gap-1.5">
                  {left && <span className="font-mono text-[11px] text-warning tabular">{left}</span>}
                  <Badge variant={m.variant}>{m.label}</Badge>
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
