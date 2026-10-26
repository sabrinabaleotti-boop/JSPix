import { redirect } from "next/navigation";
import { AppSidebar, AppTabBar } from "@/components/layout/app-nav";
import { Topbar } from "@/components/layout/topbar";
import { getClientId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client || !client.active) redirect("/");

  const fee = client.feePercent !== null ? Number(client.feePercent) : Number(await getSetting("fee_percent"));

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={{ name: client.name, handle: `código ${client.accessCode}`, role: "CLIENTE" }}
          badge={`Taxa ${fee.toFixed(2).replace(".", ",")}%`}
        />
        <main className="flex-1 px-4 py-6 pb-24 md:px-6 md:pb-8">{children}</main>
      </div>
      <AppTabBar />
    </div>
  );
}
