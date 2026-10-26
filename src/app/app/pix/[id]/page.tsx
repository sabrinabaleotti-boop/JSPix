import { notFound, redirect } from "next/navigation";
import { PixView } from "@/components/pix-view";
import { getClientId } from "@/lib/auth";
import { reconcileCharge, serializeCharge } from "@/lib/charges";
import { db } from "@/lib/db";

export default async function PixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const charge = await db.charge.findFirst({ where: { id, clientId } });
  if (!charge) notFound();
  const fresh = await reconcileCharge(charge);
  return <PixView initial={serializeCharge(fresh)} />;
}
