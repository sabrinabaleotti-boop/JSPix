import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary text-white shadow-primary", className)}>
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3l6 6-6 6-6-6z" />
        <path d="M6 15l6 6 6-6" />
      </svg>
    </span>
  );
}

export function Logo({ className, compact = false, light = false }: { className?: string; compact?: boolean; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-bold", className)}>
      <LogoMark />
      {!compact && (
        <span className={cn("text-[19px] tracking-tight", light ? "text-white" : "text-foreground")}>
          JS<span className={light ? "text-blue-200" : "text-primary"}>Pix</span>
        </span>
      )}
    </span>
  );
}
