import { TrendingUp, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  subtitle,
  value,
  delta,
  icon: Icon,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  value: string;
  delta?: number;
  icon?: LucideIcon;
  highlight?: boolean;
}) {
  const positive = (delta ?? 0) > 0;
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-5",
        highlight &&
          "border-transparent text-white [background:linear-gradient(135deg,#1b4fa0_0%,#2e7cd5_100%)] dark:[background:linear-gradient(135deg,#17408a_0%,#2978ff_100%)]",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className={cn("text-xs", highlight ? "text-white/75" : "text-muted-foreground")}>{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {delta !== undefined && !highlight && (
            <Badge variant={positive ? "success" : "neutral"}>
              {positive ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(delta).toFixed(2).replace(".", ",")}%
            </Badge>
          )}
          {Icon && (
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full",
                highlight ? "bg-white/20 text-white" : "bg-primary/12 text-primary",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
      <p className="mt-5 text-[30px] font-bold leading-none tracking-tight tabular">{value}</p>
    </Card>
  );
}
