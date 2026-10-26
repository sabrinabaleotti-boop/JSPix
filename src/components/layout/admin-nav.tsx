"use client";

import { LayoutDashboard, Users, Receipt, KeyRound, Webhook, Percent, ShieldCheck, Wallet, ArrowUpRight, Settings, Split, Banknote, Landmark } from "lucide-react";
import { Sidebar, MobileTabBar, MobileMenu, type NavGroup } from "@/components/layout/sidebar";

const groups: NavGroup[] = [
  {
    label: "Menu",
    items: [
      { label: "Visão geral", href: "/admin", icon: LayoutDashboard },
      { label: "Clientes", href: "/admin/clientes", icon: Users },
      { label: "Cobranças", href: "/admin/cobrancas", icon: Receipt },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Resumo", href: "/admin/financeiro", icon: Wallet },
      { label: "Saque", href: "/admin/financeiro/saque", icon: Banknote },
      { label: "Repasses", href: "/admin/financeiro/repasses", icon: ArrowUpRight },
    ],
  },
  {
    label: "Configurações",
    items: [
      { label: "Gateway", href: "/admin/configuracoes/gateway", icon: KeyRound },
      { label: "Recebedores", href: "/admin/configuracoes/recebedores", icon: Landmark },
      { label: "Split", href: "/admin/configuracoes/split", icon: Split },
      { label: "Webhook", href: "/admin/configuracoes/webhook", icon: Webhook },
      { label: "Taxas", href: "/admin/configuracoes/taxas", icon: Percent },
      { label: "Segurança", href: "/admin/configuracoes/seguranca", icon: ShieldCheck },
    ],
  },
];

const tabs = [
  { label: "Início", href: "/admin", icon: LayoutDashboard },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Cobranças", href: "/admin/cobrancas", icon: Receipt },
  { label: "Financeiro", href: "/admin/financeiro", icon: Wallet },
  { label: "Ajustes", href: "/admin/configuracoes/gateway", icon: Settings },
];

function Footer() {
  return (
    <div className="rounded-xl border bg-muted/40 px-3 py-2.5 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5 font-semibold text-foreground">
        <span className="relative grid h-2 w-2 place-items-center">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="absolute inset-0 rounded-full bg-success animate-pulse-ring" />
        </span>
        Sistema operacional
      </span>
      Pagamentos monitorados em tempo real.
    </div>
  );
}

export function AdminSidebar() {
  return <Sidebar groups={groups} footer={<Footer />} />;
}

export function AdminMobileMenu() {
  return <MobileMenu groups={groups} footer={<Footer />} />;
}

export function AdminTabBar() {
  return <MobileTabBar items={tabs} />;
}
