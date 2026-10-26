import { db } from "@/lib/db";

let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 60_000; // Sincroniza a cada 1 minuto

/**
 * Marca cobranças pendentes expiradas como expiradas no banco.
 * Usa cache em memória para evitar rodar muito frequentemente.
 */
export async function syncExpiredCharges() {
  const now = Date.now();

  // Se rodou há menos de 1 minuto, pula (evita sobrecarregar o banco)
  if (now - lastSyncTime < SYNC_INTERVAL_MS) {
    return;
  }

  lastSyncTime = now;

  try {
    await db.charge.updateMany({
      where: { status: "pending", expiresAt: { lt: new Date() } },
      data: { status: "expired" },
    });
  } catch (e) {
    console.error("Erro ao sincronizar cobranças expiradas:", e);
  }
}
