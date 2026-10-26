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

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 tabular",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
