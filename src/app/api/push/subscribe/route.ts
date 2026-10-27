import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminId, getClientId } from "@/lib/auth";

type Body = { subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }; scope?: unknown; endpoint?: unknown };

async function session(scope: unknown) {
  const [clientId, adminId] = await Promise.all([getClientId(), getAdminId()]);
  // O mesmo navegador pode estar logado como cliente e admin: a tela que pediu decide o papel.
  if (scope === "admin" && adminId) return { adminId, clientId: null };
  if (clientId) return { clientId, adminId: null };
  if (adminId) return { adminId, clientId: null };
  return null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const owner = await session(body.scope);
  if (!owner) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint) || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Inscrição inválida" }, { status: 400 });
  }
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, userAgent, ...owner },
    create: { endpoint, p256dh, auth, userAgent, ...owner },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const owner = await session(body.scope);
  if (!owner) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (typeof body.endpoint !== "string") return NextResponse.json({ error: "endpoint obrigatório" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, ...(owner.clientId ? { clientId: owner.clientId } : { adminId: owner.adminId }) } });
  return NextResponse.json({ ok: true });
}
