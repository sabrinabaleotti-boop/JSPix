"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/configuracoes/gateway", label: "Gateway" },
  { href: "/admin/configuracoes/recebedores", label: "Recebedores" },
  { href: "/admin/configuracoes/split", label: "Split" },
  { href: "/admin/configuracoes/transferencia-automatica", label: "Auto-saque" },
  { href: "/admin/configuracoes/webhook", label: "Webhook" },
  { href: "/admin/configuracoes/taxas", label: "Taxas" },
  { href: "/admin/configuracoes/seguranca", label: "Segurança" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto mb-5 flex max-w-4xl gap-1 overflow-x-auto rounded-2xl border bg-card p-1 shadow-card animate-fade-up">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "shrink-0 flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-all duration-200",
              active ? "gradient-primary text-white shadow-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
