import { Ban, Check, Clock, Landmark, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WITHDRAWAL_STATUS, type WithdrawalDTO, type WithdrawalStatus } from "@/lib/withdraw";
import { cn, formatBRL } from "@/lib/utils";

const ICON: Record<WithdrawalStatus, { icon: typeof Check; className: string; spin?: boolean }> = {
  pending_transfer: { icon: Clock, className: "bg-warning/12 text-warning" },
  processing: { icon: Loader2, className: "bg-primary/12 text-primary", spin: true },
  transferred: { icon: Check, className: "bg-success/12 text-success" },
  failed: { icon: XCircle, className: "bg-destructive/12 text-destructive" },
  canceled: { icon: Ban, className: "bg-muted text-muted-foreground" },
};

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Hoje às ${time}` : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })} às ${time}`;
}

function Steps({ status }: { status: WithdrawalStatus }) {
  const meta = WITHDRAWAL_STATUS[status];
  const failed = status === "failed" || status === "canceled";
  const labels = ["Solicitado", "Processando", failed ? meta.short : "Transferido"];
  return (
    <div className="mt-3">
      <div className="flex gap-1.5">
        {labels.map((_, i) => {
          const reached = i + 1 <= meta.step;
          const current = i + 1 === meta.step && !failed && status !== "transferred";
          return (
            <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full origin-left rounded-full animate-grow-x",
                  reached ? (failed ? "bg-destructive" : "bg-success") : "scale-x-0",
                  current && "animate-blink bg-primary",
                )}
                style={{ animationDelay: `${i * 120}ms` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] font-medium text-muted-foreground">
        {labels.map((l, i) => (
          <span key={l} className={cn(i + 1 <= meta.step && (failed ? "text-destructive" : status === "transferred" ? "text-success" : "text-foreground"))}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WithdrawalHistory({
  items,
  showClient = false,
  compact = false,
  empty = "Você ainda não fez nenhum saque.",
}: {
  items: WithdrawalDTO[];
  showClient?: boolean;
  compact?: boolean;
  empty?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Landmark className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium">Nenhum saque ainda</p>
        <p className="max-w-xs text-xs text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <ul className={cn("divide-y stagger", compact && "-my-1")}>
      {items.map((w) => {
        const meta = WITHDRAWAL_STATUS[w.status];
        const ic = ICON[w.status];
        const inProgress = w.status === "pending_transfer" || w.status === "processing";
        return (
          <li key={w.id} className={cn("py-3.5", compact && "py-3")}>
            <div className="flex items-start gap-3">
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", ic.className)}>
                <ic.icon className={cn("h-[18px] w-[18px]", ic.spin && "animate-spin [animation-duration:1.6s]")} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {showClient && w.clientName ? `${w.clientName} · ` : ""}
                      {w.recipientName}
                    </p>
                    <p className="text-xs text-muted-foreground">{when(w.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular">{formatBRL(w.amountCents)}</p>
                    {w.feeCents > 0 && <p className="text-[11px] text-muted-foreground tabular">tarifa {formatBRL(w.feeCents)}</p>}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant={meta.variant} dot pulse={inProgress}>
                    {meta.label}
                  </Badge>
                  {w.fundingEstimatedDate && w.status !== "failed" && w.status !== "canceled" && (
                    <span className="text-[11px] text-muted-foreground">
                      Previsão {new Date(w.fundingEstimatedDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  )}
                </div>
                {w.failureReason && <p className="mt-1.5 text-xs text-destructive">{w.failureReason}</p>}
                {!compact && <Steps status={w.status} />}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
