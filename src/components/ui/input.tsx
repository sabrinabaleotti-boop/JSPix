import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border bg-input px-3.5 text-sm text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-all duration-200 placeholder:text-muted-foreground/70",
        "hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/15",
        "disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-semibold text-muted-foreground", className)} {...props} />;
}
