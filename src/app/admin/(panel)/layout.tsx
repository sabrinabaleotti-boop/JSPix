import { AdminSidebar, AdminTabBar } from "@/components/layout/admin-nav";
import { Topbar } from "@/components/layout/topbar";
import { requireAdmin } from "@/lib/admin";
import { getEffectiveGateway, GATEWAY_LABEL } from "@/lib/gateway";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const effective = await getEffectiveGateway();
  const badge = effective === "simulated" ? "Gateway: modo simulado" : `Gateway: ${GATEWAY_LABEL[effective]}`;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={{ name: admin.email.split("@")[0], handle: admin.email, role: "ADMIN" }}
          badge={badge}
          logout={{ endpoint: "/api/admin/logout", redirectTo: "/admin/login" }}
        />
        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-8">{children}</main>
      </div>
      <AdminTabBar />
    </div>
  );
}
