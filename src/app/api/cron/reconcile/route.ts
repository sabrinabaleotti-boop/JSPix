import { NextResponse } from "next/server";
import { reconcilePendingCharges } from "@/lib/reconcile";
import { syncExpiredCharges } from "@/lib/expiry-sync";

/**
 * Para um agendador externo (cron-job.org, UptimeRobot…) chamar a cada minuto: confere os Pix pendentes na gateway
 * mesmo sem ninguém com o app aberto e, de quebra, mantém o serviço acordado. Protegido por CRON_SECRET
 * (?key=… ou Authorization: Bearer …).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const url = new URL(req.url);
  const given = url.searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given !== secret) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const [changed] = await Promise.all([reconcilePendingCharges(true), syncExpiredCharges()]);
  return NextResponse.json({ ok: true, changed, at: new Date().toISOString() });
}
