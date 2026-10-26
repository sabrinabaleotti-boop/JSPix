"use client";

import { LayoutDashboard, Users, Receipt, KeyRound, Webhook, Percent, ShieldCheck, Wallet, ArrowUpRight, Settings, Split, Banknote } from "lucide-react";
import { Sidebar, MobileTabBar, type NavGroup } from "@/components/layout/sidebar";

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

export function AdminSidebar() {
  return <Sidebar groups={groups} />;
}

export function AdminTabBar() {
  return <MobileTabBar items={tabs} />;
}
