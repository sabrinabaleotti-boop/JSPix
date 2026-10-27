import webpush from "web-push";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/utils";

export type PaidPayload = {
  type: "paid";
  chargeId: string;
  amountCents: number;
  title: string;
  body: string;
  url: string;
  tag: string;
};

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function configure() {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:admin@jspix.app", pub, priv);
  return true;
}

/**
 * Avisa, por Web Push, o cliente dono da cobrança e todos os admins inscritos. Nunca lança: o pagamento já foi
 * confirmado e o webhook precisa responder 200 de qualquer jeito. Inscrições mortas (404/410) são apagadas.
 */
export async function notifyChargePaid(chargeId: string) {
  try {
    if (!configure()) return;
    const c = await db.charge.findUnique({ where: { id: chargeId }, include: { client: { select: { name: true } } } });
    if (!c || c.status !== "paid") return;
    const subs = await db.pushSubscription.findMany({ where: { OR: [{ clientId: c.clientId }, { adminId: { not: null } }] } });
    if (subs.length === 0) return;
    const amount = formatBRL(c.amountCents);
    await Promise.all(
      subs.map(async (s) => {
        const isAdmin = !!s.adminId;
        const payload: PaidPayload = {
          type: "paid",
          chargeId: c.id,
          amountCents: c.amountCents,
          title: `Pix recebido · ${amount}`,
          body: isAdmin ? `${c.client.name}${c.description ? ` · ${c.description}` : ""}` : c.description || "Pagamento confirmado na sua conta",
          url: isAdmin ? "/admin/cobrancas" : `/app/pix/${c.id}`,
          tag: `paid-${c.id}`,
        };
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "high" });
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          else console.error("[push] falha ao enviar:", status, (e as Error).message);
        }
      }),
    );
  } catch (e) {
    console.error("[push] notifyChargePaid:", (e as Error).message);
  }
}
