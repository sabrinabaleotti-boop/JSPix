import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientId } from "@/lib/auth";
import { markPaid } from "@/lib/charges";

/** Só para cobranças simuladas (sem gateway configurada): marca como paga para testar a UI. */
export async function POST(req: Request) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  const charge = await db.charge.findFirst({ where: { id, clientId } });
  if (!charge) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  if (charge.gateway !== "simulated") {
    return NextResponse.json({ error: "Só disponível em cobranças simuladas" }, { status: 400 });
  }
  await markPaid(charge.id, new Date());
  return NextResponse.json({ ok: true });
}
