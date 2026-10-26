import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

/** Mostrado na hora do clique enquanto o servidor monta a página (loading.tsx). */
export function PageSkeleton({ width = "max-w-7xl" }: { width?: string }) {
  return (
    <div className={cn("mx-auto space-y-5 animate-fade-in", width)} aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <Bar className="h-7 w-48" />
        <Bar className="h-4 w-80 max-w-full" />
      </div>
      <Bar className="h-36 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Bar className="h-28 rounded-2xl" />
        <Bar className="h-28 rounded-2xl" />
        <Bar className="h-28 rounded-2xl" />
      </div>
      <Bar className="h-72 rounded-2xl" />
    </div>
  );
}
