import { db } from "@/lib/db";

const defaults: Record<string, string> = {
  fee_percent: "5.00",
  fee_fixed_cents: "0",
  default_expiry_min: "30",
  min_amount_cents: "100",
  max_amount_cents: "0",
  gateway_fee_percent: "1.19",
  // Exemplo de tarifa por transferência da doc da Pagar.me; o valor real é o do contrato da conta.
  withdraw_fee_cents: "367",
  auto_transfer_enabled: "false",
  auto_transfer_reserve_cents: "500",
};

// O banco fica em São Paulo e o servidor nos EUA: cada leitura custa ~0,2 s. As configurações mudam pouco,
// então ficam 30 s em memória. Gravar ou apagar pelas funções abaixo limpa a chave na hora.
// Em globalThis para que rotas e server actions (bundles diferentes) vejam o mesmo cache.
const TTL_MS = 30_000;
const g = globalThis as unknown as { __jpixSettings?: Map<string, { value: string | null; at: number }> };
const cache = (g.__jpixSettings ??= new Map());

function cached(key: string) {
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < TTL_MS ? hit : null;
}

export async function getSetting(key: string) {
  const hit = cached(key);
  if (hit) return hit.value ?? defaults[key] ?? "";
  const row = await db.setting.findUnique({ where: { key } });
  cache.set(key, { value: row?.value ?? null, at: Date.now() });
  return row?.value ?? defaults[key] ?? "";
}

export async function getSettings(keys: string[]) {
  const missing = keys.filter((k) => !cached(k));
  if (missing.length) {
    const rows = await db.setting.findMany({ where: { key: { in: missing } } });
    const found = new Map(rows.map((r) => [r.key, r.value]));
    const at = Date.now();
    for (const k of missing) cache.set(k, { value: found.get(k) ?? null, at });
  }
  const map: Record<string, string> = {};
  for (const k of keys) map[k] = cache.get(k)?.value ?? defaults[k] ?? "";
  return map;
}

export async function setSetting(key: string, value: string) {
  cache.delete(key);
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  cache.delete(key);
}

export async function deleteSettings(keys: string[]) {
  for (const k of keys) cache.delete(k);
  await db.setting.deleteMany({ where: { key: { in: keys } } });
  for (const k of keys) cache.delete(k);
}
