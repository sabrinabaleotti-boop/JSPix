import { db } from "@/lib/db";
import { applyRemoteStatus } from "@/lib/charges";
import { fetchRemoteState } from "@/lib/gateway";

const EVERY_MS = 15_000;
const LOOKBACK_MS = 2 * 3600_000;
const BATCH = 25;
let last = 0;
let running: Promise<number> | null = null;

/**
 * Confere na gateway as cobranças pendentes recentes e aplica o status real (pago, cancelado, expirado).
 * É a rede de segurança para webhook perdido ou não configurado: roda em paralelo, no máximo a cada 15 s por
 * processo, e marcar como pago dispara o mesmo aviso (push + som) do webhook. Devolve quantas mudaram.
 */
export async function reconcilePendingCharges(force = false): Promise<number> {
  if (running) return running;
  if (!force && Date.now() - last < EVERY_MS) return 0;
  last = Date.now();
  running = (async () => {
    try {
      const pending = await db.charge.findMany({
        where: { status: "pending", gateway: { in: ["pagarme", "legacy"] }, gatewayId: { not: null }, expiresAt: { gt: new Date(Date.now() - LOOKBACK_MS) } },
        orderBy: { createdAt: "desc" },
        take: BATCH,
      });
      let changed = 0;
      await Promise.all(
        pending.map(async (c) => {
          try {
            const remote = await fetchRemoteState(c);
            if (remote && remote.status !== "pending") {
              const updated = await applyRemoteStatus(c, remote.status, remote);
              if (updated.status !== c.status) changed++;
            } else if (c.expiresAt.getTime() < Date.now()) {
              await db.charge.update({ where: { id: c.id }, data: { status: "expired" } });
              changed++;
            }
          } catch (e) {
            console.error("[reconcile] cobrança", c.id, (e as Error).message);
          }
        }),
      );
      return changed;
    } catch (e) {
      console.error("[reconcile]", (e as Error).message);
      return 0;
    } finally {
      running = null;
    }
  })();
  return running;
}
