import { Card, CardContent } from "@/components/ui/card";

function Bar({ className }: { className: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

/** Enquanto a Pagar.me responde os saldos dos recebedores. */
export function RecipientsSkeleton() {
  return (
    <div className="space-y-2.5 animate-fade-in" aria-busy="true" aria-label="Carregando contas">
      <Bar className="h-4 w-56" />
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-card">
          <Bar className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bar className="h-4 w-2/3" />
            <Bar className="h-3 w-1/3" />
          </div>
          <div className="space-y-2">
            <Bar className="h-5 w-20" />
            <Bar className="h-3 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Enquanto o histórico sincroniza com a Pagar.me. */
export function HistorySkeleton() {
  return (
    <Card className="min-w-0 animate-fade-in" aria-busy="true" aria-label="Carregando histórico">
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Bar className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bar className="h-4 w-40" />
            <Bar className="h-3 w-28" />
          </div>
          <Bar className="h-8 w-24" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Bar className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-1/2" />
              <Bar className="h-3 w-1/3" />
              <Bar className="h-1.5 w-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
