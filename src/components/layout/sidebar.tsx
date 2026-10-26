"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

export type NavItem = { label: string; href: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

/** O item ativo é o de href mais longo que cobre a rota atual (assim /admin/financeiro/saque não acende /admin/financeiro). */
function activeHref(groups: NavGroup[], pathname: string) {
  let best: string | null = null;
  for (const g of groups) {
    for (const item of g.items) {
      const nested = item.href.split("/").length > 2;
      const match = pathname === item.href || (nested && pathname.startsWith(item.href + "/"));
      if (match && (!best || item.href.length > best.length)) best = item.href;
    }
  }
  return best;
}

function NavList({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeHref(groups, pathname);
  return (
    <nav className="flex-1 space-y-6 px-3 py-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">{group.label}</p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300",
                        active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                      )}
                    />
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-lg transition-colors duration-200",
                        active ? "bg-primary text-white shadow-primary" : "bg-muted/70 text-muted-foreground group-hover:bg-accent group-hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ groups, footer, className }: { groups: NavGroup[]; footer?: React.ReactNode; className?: string }) {
  return (
    <aside className={cn("sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar md:flex", className)}>
      <div className="flex h-16 items-center px-5">
        <Link href={groups[0]?.items[0]?.href ?? "/"} className="press">
          <Logo />
        </Link>
      </div>
      <NavList groups={groups} />
      {footer && <div className="p-3">{footer}</div>}
    </aside>
  );
}

/** Menu completo no celular: abre pelo botão no topo e desliza da esquerda. */
export function MobileMenu({ groups, footer }: { groups: NavGroup[]; footer?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha ao trocar de página
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="grid h-9 w-9 place-items-center rounded-xl border bg-card text-foreground press md:hidden"
      >
        <Menu className="h-4.5 w-4.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/45 backdrop-blur-sm animate-fade-in" />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-sidebar shadow-2xl animate-slide-in-left">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-accent">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList groups={groups} onNavigate={() => setOpen(false)} />
            </div>
            {footer && <div className="p-3">{footer}</div>}
          </div>
        </div>
      )}
    </>
  );
}

/** Barra flutuante no celular com os atalhos principais. */
export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-30 rounded-2xl border glass-card shadow-[0_18px_40px_-16px_rgb(15_23_42/0.45)] md:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2 text-[10.5px] font-semibold transition-colors", active ? "text-primary" : "text-muted-foreground")}
              >
                <span
                  className={cn(
                    "grid h-8 w-12 place-items-center rounded-xl transition-all duration-300",
                    active ? "gradient-primary text-white shadow-primary scale-100" : "scale-95",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
