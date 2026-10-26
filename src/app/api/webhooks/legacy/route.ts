import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { getLegacyWebhookSecret, verifyLegacySignature } from "@/lib/legacy";
import { processLegacyEvent } from "@/lib/webhooks";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  // 1. Token na URL: só a Legacy recebe esse endereço (vai na webhookUrl de cada cobrança).
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const expected = await getSetting("legacy_webhook_token");
  if (!expected || !safeEqual(token, expected)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // 2. Assinatura HMAC, quando ativada no painel da Legacy e o segredo whsec_ foi salvo no admin.
  const raw = await req.text();
  const secret = await getLegacyWebhookSecret();
  if (secret && !verifyLegacySignature(raw, req.headers.get("x-webhook-signature"), secret)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let body: { id?: string; status?: string; referenceId?: string | null };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }
  if (!body?.id) return NextResponse.json({ error: "Evento sem id" }, { status: 400 });

  const eventType = req.headers.get("x-webhook-event") ?? `${body.id.startsWith("payout_") ? "payout" : "payin"}.${(body.status ?? "").toLowerCase()}`;
  const webhookId = req.headers.get("x-webhook-id") ?? createHash("sha256").update(raw).digest("hex").slice(0, 32);
  const eventId = `legacy:${webhookId}`;

  try {
    await db.webhookEvent.create({ data: { id: eventId, type: `legacy ${eventType}`, payload: body } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }

  try {
    const note = await processLegacyEvent(body, req.headers.get("x-webhook-event"));
    await db.webhookEvent.update({ where: { id: eventId }, data: { processed: true, error: note.startsWith("ignorado") ? note : null } });
  } catch (e) {
    console.error("legacy webhook failed", e);
    await db.webhookEvent.update({ where: { id: eventId }, data: { error: e instanceof Error ? e.message : "erro" } });
    // 500 faz a Legacy reenviar depois.
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
