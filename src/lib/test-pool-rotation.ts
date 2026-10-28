import { createHash } from "crypto";
import { getTestPayerByIndex, getTestPoolSize } from "@/lib/test-pool";

/**
 * Pool de testes com cache em memória para evitar UPDATE ao banco.
 * Usa hash do clientId + timestamp para variar a pool sem BD.
 */
const poolCache = new Map<string, { seed: number; refreshedAt: number }>();
const CACHE_TTL_MS = 60000; // 1 minuto

export async function getNextTestPayerForClient(clientId: string) {
  const now = Date.now();
  const cached = poolCache.get(clientId);
  let seed = cached?.seed ?? 0;

  // Regenera a seed a cada minuto ou se não tiver cache
  if (!cached || now - cached.refreshedAt > CACHE_TTL_MS) {
    const hash = createHash("sha256").update(`${clientId}:${Math.floor(now / CACHE_TTL_MS)}`).digest();
    seed = hash.readUInt32BE(0) % getTestPoolSize();
    poolCache.set(clientId, { seed, refreshedAt: now });
  } else {
    // Incrementa a seed a cada chamada dentro da janela de cache
    seed = (cached.seed + 1) % getTestPoolSize();
    poolCache.set(clientId, { seed, refreshedAt: cached.refreshedAt });
  }

  return getTestPayerByIndex(seed);
}
