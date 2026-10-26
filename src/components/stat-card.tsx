import { TrendingDown, TrendingUp, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/count-up";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle: string;
  /** Texto pronto (sem animação). Prefira `cents` ou `count` para o número subir na tela. */
  value?: string;
  cents?: number;
  count?: number;
  delta?: number;
  icon?: LucideIcon;
  highlight?: boolean;
  className?: string;
};

export function StatCard({ title, subtitle, value, cents, count, delta, icon: Icon, highlight = false, className }: Props) {
  const positive = (delta ?? 0) > 0;
  const negative = (delta ?? 0) < 0;
  return (
    <Card
      className={cn(
        "card-hover relative overflow-hidden p-5",
        highlight && "mesh shine border-transparent text-white gradient-hero shadow-[0_18px_40px_-18px_rgb(29_78_216/0.6)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-[13px] font-semibold", highlight ? "text-white/90" : "text-foreground")}>{title}</p>
          <p className={cn("mt-0.5 truncate text-xs", highlight ? "text-white/70" : "text-muted-foreground")}>{subtitle}</p>
        </div>
        {Icon && (
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105",
              highlight ? "bg-white/18 text-white ring-1 ring-white/25" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-5 flex items-end justify-between gap-2">
        <p className={cn("text-[30px] font-bold leading-none tracking-tight tabular", highlight && "drop-shadow-sm")}>
          {cents !== undefined ? <CountUp value={cents} format="brl" /> : count !== undefined ? <CountUp value={count} format="int" /> : value}
        </p>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular",
              highlight
                ? "bg-white/18 text-white"
                : positive
                  ? "bg-success/12 text-success"
                  : negative
                    ? "bg-destructive/12 text-destructive"
                    : "bg-muted text-muted-foreground",
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : negative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1).replace(".", ",")}%
          </span>
        )}
      </div>
    </Card>
  );
}
