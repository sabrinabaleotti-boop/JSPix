import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientId } from "@/lib/auth";
import { reconcileCharge, serializeCharge } from "@/lib/charges";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const charge = await db.charge.findFirst({ where: { id, clientId } });
  if (!charge) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  const fresh = await reconcileCharge(charge);
  return NextResponse.json(serializeCharge(fresh));
}
