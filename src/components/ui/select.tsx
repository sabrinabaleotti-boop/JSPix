import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border bg-input px-3.5 text-sm text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-all duration-200",
        "hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
        className,
      )}
      {...props}
    />
  );
}
