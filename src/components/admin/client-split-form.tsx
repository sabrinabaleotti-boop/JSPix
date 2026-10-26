"use client";

import { useState } from "react";
import { AdminForm } from "@/components/admin/form";
import { SplitEditor, type RecipientOption } from "@/components/admin/split-editor";
import { cn } from "@/lib/utils";
import { saveClientSplit } from "@/app/admin/actions";
import type { SplitRule } from "@/lib/split";

type Mode = "default" | "none" | "custom";

export function ClientSplitForm({
  clientId,
  initialMode,
  initialRules,
  recipients,
  defaultSummary,
}: {
  clientId: string;
  initialMode: Mode;
  initialRules: SplitRule[];
  recipients: RecipientOption[];
  defaultSummary: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const canCustom = recipients.length > 0;

  return (
    <AdminForm action={saveClientSplit} submitLabel="Salvar split do cliente">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="mode" value={mode} />
      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            ["default", "Usar o padrão", defaultSummary],
            ["none", "Sem split", "Tudo fica na conta principal"],
            ["custom", "Split próprio", canCustom ? "Defina a % de cada recebedor" : "Cadastre recebedores primeiro"],
          ] as const
        ).map(([value, title, hint]) => (
          <button
            type="button"
            key={value}
            onClick={() => (value !== "custom" || canCustom) && setMode(value)}
            disabled={value === "custom" && !canCustom}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              mode === value ? "border-primary bg-primary/5" : "hover:bg-accent",
              value === "custom" && !canCustom && "opacity-50 cursor-not-allowed",
            )}
          >
            <span className="block text-sm font-semibold">{title}</span>
            <span className="block text-xs text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>
      {mode === "custom" && canCustom && <SplitEditor recipients={recipients} initial={initialRules} />}
    </AdminForm>
  );
}
