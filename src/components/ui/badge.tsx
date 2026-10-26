import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "neutral" | "success" | "warning" | "destructive" | "primary" | "outline";

const styles: Record<Variant, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/12 text-destructive",
  primary: "bg-primary/12 text-primary",
  outline: "border text-muted-foreground",
};

const dots: Record<Variant, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  primary: "bg-primary",
  outline: "bg-muted-foreground",
};

export function Badge({
  variant = "neutral",
  dot = false,
  pulse = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant; dot?: boolean; pulse?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 tabular", styles[variant], className)}
      {...props}
    >
      {dot && (
        <span className="relative grid h-1.5 w-1.5 place-items-center">
          <span className={cn("h-1.5 w-1.5 rounded-full", dots[variant])} />
          {pulse && <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", dots[variant])} />}
        </span>
      )}
      {children}
    </span>
  );
}
