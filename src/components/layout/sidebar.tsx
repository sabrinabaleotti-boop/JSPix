"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export function Sidebar({ groups, className }: { groups: NavGroup[]; className?: string }) {
  const pathname = usePathname();
  return (
    <aside className={cn("hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar", className)}>
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-6 px-3 py-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                // Itens de primeiro nível (/app, /admin) só ficam ativos na própria página.
                const nested = item.href.split("/").length > 2;
                const active = pathname === item.href || (nested && pathname.startsWith(item.href + "/"));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                        active ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-card md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
