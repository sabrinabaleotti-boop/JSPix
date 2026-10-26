"use client";

import { BarChart3, History, QrCode, LayoutDashboard, BookOpen, Banknote } from "lucide-react";
import { Sidebar, MobileTabBar, type NavGroup } from "@/components/layout/sidebar";

const groups: NavGroup[] = [
  { label: "Menu", items: [{ label: "Início", href: "/app", icon: LayoutDashboard }] },
  {
    label: "Pix",
    items: [
      { label: "Gerar Pix", href: "/app/gerar", icon: QrCode },
      { label: "Sacar", href: "/app/saque", icon: Banknote },
      { label: "Histórico", href: "/app/historico", icon: History },
      { label: "Resumo", href: "/app/resumo", icon: BarChart3 },
    ],
  },
  { label: "Ajuda", items: [{ label: "Como funciona", href: "/app/ajuda", icon: BookOpen }] },
];

const tabs = [
  { label: "Início", href: "/app", icon: LayoutDashboard },
  { label: "Gerar", href: "/app/gerar", icon: QrCode },
  { label: "Sacar", href: "/app/saque", icon: Banknote },
  { label: "Histórico", href: "/app/historico", icon: History },
  { label: "Resumo", href: "/app/resumo", icon: BarChart3 },
];

export function AppSidebar() {
  return <Sidebar groups={groups} />;
}

export function AppTabBar() {
  return <MobileTabBar items={tabs} />;
}
