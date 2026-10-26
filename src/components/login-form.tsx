"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Não foi possível entrar");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <div>
        <Label htmlFor="code">Código de acesso</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="0000"
          className="h-12 text-center font-mono text-xl tracking-[0.3em]"
          aria-invalid={!!error}
        />
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </div>
      <Button size="lg" className="w-full" disabled={loading || code.length < 4}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Entrar <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </form>
  );
}
