"use client";

import { Check, Copy, Loader2, ScanFace } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recipientKycLinkAction, type KycLinkState } from "@/app/admin/actions";

export function KycLinkButton({ recipientId }: { recipientId: string }) {
  const [state, setState] = useState<KycLinkState>({});
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (state.url) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 px-2 text-xs"
          onClick={async () => {
            await navigator.clipboard.writeText(state.url!);
            setCopied(true);
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar link"}
        </Button>
        <span className="text-[11px] text-muted-foreground">expira em 20 min</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" className="h-8 px-2 text-xs" disabled={pending} onClick={() => start(async () => setState(await recipientKycLinkAction(recipientId)))}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanFace className="h-3.5 w-3.5" />}
        Prova de vida
      </Button>
      {state.error && <span className="max-w-[220px] whitespace-normal text-[11px] text-destructive">{state.error}</span>}
    </div>
  );
}
