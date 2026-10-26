"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/configuracoes/gateway", label: "Gateway" },
  { href: "/admin/configuracoes/recebedores", label: "Recebedores" },
  { href: "/admin/configuracoes/split", label: "Split" },
  { href: "/admin/configuracoes/webhook", label: "Webhook" },
  { href: "/admin/configuracoes/taxas", label: "Taxas" },
  { href: "/admin/configuracoes/seguranca", label: "Segurança" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto mb-5 flex max-w-4xl gap-1 overflow-x-auto rounded-lg border bg-card p-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "shrink-0 flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
            pathname.startsWith(t.href) ?"bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
