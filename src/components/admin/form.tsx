"use client";

import { Loader2 } from "lucide-react";
import { startTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormState } from "@/app/admin/actions";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;
type Variant = "primary" | "outline" | "destructive" | "ghost";

/** Botão de envio. Usa `pending` explícito quando informado; senão lê o estado do <form> pai. */
export function SubmitButton({
  children,
  variant = "primary",
  className,
  pending,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <Button type="submit" variant={variant} disabled={busy} className={className}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

/**
 * Formulário ligado a uma server action com mensagem de erro/sucesso.
 * Envia via onSubmit (e não via `action`) para o React não limpar os campos quando a validação falha.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Salvar",
  className,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      className={cn("space-y-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {children}
      {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{state.ok}</p>}
      <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
    </form>
  );
}

/** Botão isolado que dispara uma server action com estado (ex.: "Testar conexão"). */
export function ActionButton({ action, label, variant = "outline" }: { action: (s: FormState) => Promise<FormState>; label: string; variant?: Variant }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <SubmitButton variant={variant} pending={pending}>{label}</SubmitButton>
      {state.error && <span className="text-sm text-destructive">{state.error}</span>}
      {state.ok && <span className="text-sm text-success">{state.ok}</span>}
    </form>
  );
}
