import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l6 6-6 6-6-6z" />
          <path d="M6 15l6 6 6-6" />
        </svg>
      </span>
      {!compact && <span className="text-lg tracking-tight">JPix</span>}
    </span>
  );
}
