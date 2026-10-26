"use client";

import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyField({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(!secret);
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        <code className="flex h-10 min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap rounded-md border bg-muted px-3 font-mono text-xs">
          {shown ? value : "•".repeat(Math.min(value.length, 24))}
        </code>
        {secret && (
          <Button type="button" variant="outline" size="icon" className="h-10 w-10" aria-label={shown ? "Ocultar" : "Mostrar"} onClick={() => setShown((v) => !v)}>
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          aria-label="Copiar"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
