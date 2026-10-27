import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId, getClientId } from "@/lib/auth";
import { reconcilePendingCharges } from "@/lib/reconcile";

const MAX_WINDOW_MS = 10 * 60 * 1000;

/** Pix pagos desde `since` (ISO): o app consulta de tempos em tempos para tocar o som mesmo sem push. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");
  const [clientId, adminId] = await Promise.all([getClientId(), getAdminId()]);
  const asAdmin = scope === "admin" && !!adminId;
  if (!asAdmin && !clientId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Rede de segurança para webhook perdido: confere os pendentes na gateway antes de listar os pagos.
  await reconcilePendingCharges();

  const now = new Date();
  const sinceRaw = Date.parse(url.searchParams.get("since") ?? "");
  if (!Number.isFinite(sinceRaw)) return NextResponse.json({ items: [], now: now.toISOString() });
  const since = new Date(Math.max(sinceRaw, now.getTime() - MAX_WINDOW_MS));

  const items = await db.charge.findMany({
    where: { status: "paid", paidAt: { gt: since }, ...(asAdmin ? {} : { clientId: clientId as string }) },
    orderBy: { paidAt: "asc" },
    take: 10,
    include: { client: { select: { name: true } } },
  });
  return NextResponse.json({
    now: now.toISOString(),
    items: items.map((c) => ({
      chargeId: c.id,
      amountCents: c.amountCents,
      description: c.description,
      clientName: c.client.name,
      paidAt: c.paidAt?.toISOString() ?? null,
      url: asAdmin ? "/admin/cobrancas" : `/app/pix/${c.id}`,
    })),
  });
}
