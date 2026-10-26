import { getSetting, setSetting } from "@/lib/settings";

/** Uma regra: recebedor da Pagar.me, porcentagem inteira e se é o responsável (taxas, chargeback e restante). */
export type SplitRule = { recipientId: string; name: string; percent: number; responsible: boolean };

/** Split padrão da conta. */
export type SplitDefault = { enabled: boolean; rules: SplitRule[] };

/** Split de um cliente: null usa o padrão. */
export type ClientSplit = { mode: "none" } | { mode: "custom"; rules: SplitRule[] } | null;

/** Valida as regras e devolve a mensagem de erro, ou null se estiver tudo certo. */
export function validateRules(rules: SplitRule[]): string | null {
  if (rules.length === 0) return "Adicione ao menos um recebedor";
  const ids = new Set<string>();
  for (const r of rules) {
    // IDs de recebedor da Pagar.me aparecem como rp_... ou re_..., dependendo da conta.
    if (!/^r[ep]_[A-Za-z0-9]+$/.test(r.recipientId)) return "Escolha o recebedor em todas as linhas";
    if (ids.has(r.recipientId)) return "O mesmo recebedor aparece mais de uma vez";
    ids.add(r.recipientId);
    if (!Number.isInteger(r.percent) || r.percent < 1 || r.percent > 100) return "Cada porcentagem precisa ser um número inteiro de 1 a 100";
  }
  const total = rules.reduce((s, r) => s + r.percent, 0);
  if (total !== 100) return `As porcentagens somam ${total}%. Precisam fechar 100%.`;
  if (rules.filter((r) => r.responsible).length !== 1) return "Marque exatamente um recebedor como responsável";
  return null;
}

/** Normaliza o que veio do formulário (JSON) em regras tipadas. */
export function parseRules(json: string): SplitRule[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    recipientId: String(r?.recipientId ?? ""),
    name: String(r?.name ?? "").slice(0, 120),
    percent: Number(r?.percent),
    responsible: !!r?.responsible,
  }));
}

export async function getSplitDefault(): Promise<SplitDefault> {
  try {
    const v = JSON.parse((await getSetting("split_default")) || "null");
    if (v && Array.isArray(v.rules)) return { enabled: !!v.enabled, rules: v.rules };
  } catch {}
  return { enabled: false, rules: [] };
}

export async function saveSplitDefault(v: SplitDefault) {
  await setSetting("split_default", JSON.stringify(v));
}

export function asClientSplit(v: unknown): ClientSplit {
  if (!v || typeof v !== "object") return null;
  const o = v as { mode?: string; rules?: SplitRule[] };
  if (o.mode === "none") return { mode: "none" };
  if (o.mode === "custom" && Array.isArray(o.rules)) return { mode: "custom", rules: o.rules };
  return null;
}

/** Regras que valem para um cliente agora, ou null se não houver split. */
export async function resolveSplit(clientSplit: unknown): Promise<SplitRule[] | null> {
  const c = asClientSplit(clientSplit);
  if (c?.mode === "none") return null;
  if (c?.mode === "custom") return validateRules(c.rules) ? null : c.rules;
  const d = await getSplitDefault();
  return d.enabled && !validateRules(d.rules) ? d.rules : null;
}

/** Formato do campo `split` do pagamento na Pagar.me. */
export function toPagarmeSplit(rules: SplitRule[]) {
  return rules.map((r) => ({
    amount: r.percent,
    type: "percentage",
    recipient_id: r.recipientId,
    options: { charge_processing_fee: r.responsible, charge_remainder_fee: r.responsible, liable: r.responsible },
  }));
}
