"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RefreshButton({ label = "Atualizar", className }: { label?: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button type="button" variant="outline" size="sm" className={className} disabled={pending} onClick={() => start(() => router.refresh())}>
      <RefreshCw className={cn("h-3.5 w-3.5", pending && "animate-spin")} /> {label}
    </Button>
  );
}
