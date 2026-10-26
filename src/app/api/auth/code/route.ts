import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClientSession } from "@/lib/auth";
import { onlyDigits } from "@/lib/masks";

const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now() && a.n >= 10) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde 15 minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const code = onlyDigits(String(body.code ?? ""));
  if (code.length < 4 || code.length > 8) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const client = await db.client.findUnique({ where: { accessCode: code } });
  if (!client || !client.active) {
    const cur = attempts.get(ip);
    attempts.set(ip, { n: (cur && cur.until > Date.now() ? cur.n : 0) + 1, until: Date.now() + 15 * 60 * 1000 });
    return NextResponse.json({ error: "Código inválido ou desativado" }, { status: 401 });
  }

  attempts.delete(ip);
  await createClientSession(client.id);
  return NextResponse.json({ ok: true });
}
