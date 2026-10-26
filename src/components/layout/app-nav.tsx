"use client";

import Link from "next/link";
import { BarChart3, History, QrCode, LayoutDashboard, BookOpen, Banknote, LifeBuoy } from "lucide-react";
import { Sidebar, MobileTabBar, MobileMenu, type NavGroup } from "@/components/layout/sidebar";

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

function Footer() {
  return (
    <Link href="/app/ajuda" className="mesh block rounded-xl gradient-primary p-3.5 text-white shadow-primary press">
      <span className="flex items-center gap-2 text-sm font-semibold">
        <LifeBuoy className="h-4 w-4" /> Precisa de ajuda?
      </span>
      <span className="mt-0.5 block text-[11px] text-white/80">Veja como gerar, receber e sacar.</span>
    </Link>
  );
}

export function AppSidebar() {
  return <Sidebar groups={groups} footer={<Footer />} />;
}

export function AppMobileMenu() {
  return <MobileMenu groups={groups} footer={<Footer />} />;
}

export function AppTabBar() {
  return <MobileTabBar items={tabs} />;
}
