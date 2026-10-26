import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { decryptSecret } from "@/lib/crypto";
import { processPagarmeEvent } from "@/lib/webhooks";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const s = await getSettings(["webhook_user", "webhook_pass_enc"]);
  if (!s.webhook_user || !s.webhook_pass_enc) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
  }
  const expected = "Basic " + Buffer.from(`${s.webhook_user}:${decryptSecret(s.webhook_pass_enc)}`).toString("base64");
  if (!safeEqual(req.headers.get("authorization") ?? "", expected)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const event = await req.json().catch(() => null);
  if (!event || typeof event.id !== "string" || typeof event.type !== "string") {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  try {
    await db.webhookEvent.create({ data: { id: event.id, type: event.type, payload: event } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }

  try {
    const note = await processPagarmeEvent(event);
    await db.webhookEvent.update({ where: { id: event.id }, data: { processed: true, error: note.startsWith("ignorado") ? note : null } });
  } catch (e) {
    console.error("webhook processing failed", e);
    await db.webhookEvent.update({ where: { id: event.id }, data: { error: e instanceof Error ? e.message : "erro" } });
  }
  return NextResponse.json({ ok: true });
}
