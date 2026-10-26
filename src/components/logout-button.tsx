"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton({ endpoint = "/api/auth/logout", redirectTo = "/" }: { endpoint?: string; redirectTo?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Sair"
      onClick={async () => {
        await fetch(endpoint, { method: "POST" });
        router.push(redirectTo);
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
