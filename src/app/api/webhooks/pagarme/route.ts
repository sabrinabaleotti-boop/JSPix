import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { deleteSettings, getSettings, setSetting } from "@/lib/settings";
import { decryptSecret } from "@/lib/crypto";
import { processPagarmeEvent } from "@/lib/webhooks";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Guarda só o que ajuda a diagnosticar (usuário e tamanho da senha recebidos), nunca a senha em si.
async function recordRejected(received: string, user: string, password: string) {
  const [scheme = "", token = ""] = received.split(" ");
  let gotUser = "";
  let gotPassLen = 0;
  if (scheme.toLowerCase() === "basic") {
    const [u = "", ...rest] = Buffer.from(token, "base64").toString("utf8").split(":");
    gotUser = u;
    gotPassLen = rest.join(":").length;
  }
  const info = { at: new Date().toISOString(), scheme: scheme || "nenhum", user: gotUser, passLen: gotPassLen, userOk: gotUser === user, passLenOk: gotPassLen === password.length };
  await setSetting("webhook_last_rejected", JSON.stringify(info)).catch(() => {});
}

export async function POST(req: Request) {
  const s = await getSettings(["webhook_user", "webhook_pass_enc", "webhook_last_rejected"]);
  if (!s.webhook_user || !s.webhook_pass_enc) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
  }
  const password = decryptSecret(s.webhook_pass_enc);
  const expected = "Basic " + Buffer.from(`${s.webhook_user}:${password}`).toString("base64");
  const received = req.headers.get("authorization") ?? "";
  if (!safeEqual(received, expected)) {
    await recordRejected(received, s.webhook_user, password);
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (s.webhook_last_rejected) await deleteSettings(["webhook_last_rejected"]);

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
