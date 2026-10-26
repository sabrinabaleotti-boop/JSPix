import { unstable_cache } from "next/cache";
import { splitPhone } from "@/lib/masks";
import { getSetting } from "@/lib/settings";
import { decryptSecret } from "@/lib/crypto";

const BASE = "https://api.pagar.me/core/v5";

export type PixOrderResult = {
  orderId: string;
  chargeId: string;
  status: string;
  qrCode: string;
  qrCodeUrl: string | null;
  expiresAt: Date;
};

export class PagarmeError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

/** Chave: env tem prioridade; senão a cifrada no banco (configurada no /admin). */
export async function getSecretKey() {
  const env = process.env.PAGARME_SECRET_KEY?.trim();
  if (env) return env;
  const enc = await getSetting("pagarme_secret_enc");
  if (enc) return decryptSecret(enc);
  return "";
}

async function request<T>(path: string, init: RequestInit = {}) {
  const key = await getSecretKey();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    // Em 401/403 junta o detalhe da Pagar.me: a mesma chave pode valer para uma rota e não para outra.
    const auth = authErrorMessage(res.status);
    const detail = describeError(body);
    const msg = auth ? (detail ? `${auth} (Pagar.me: ${detail})` : auth) : (detail ?? `Pagar.me HTTP ${res.status}`);
    throw new PagarmeError(msg, res.status, body);
  }
  return body as T;
}

type OrderResponse = {
  id: string;
  status: string;
  charges: {
    id: string;
    status: string;
    paid_at?: string;
    last_transaction?: {
      status?: string;
      qr_code?: string;
      qr_code_url?: string;
      expires_at?: string;
    };
  }[];
};

export async function createPixOrder(input: {
  chargeId: string;
  clientId: string;
  amountCents: number;
  description: string;
  payer: { name: string; cpf: string; email: string; phone: string };
  expiresInSeconds: number;
  /** Campo `split` já no formato da Pagar.me; omitido quando não há split. */
  split?: unknown[];
}): Promise<PixOrderResult> {
  const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);

  const body = {
    closed: true,
    customer: {
      name: input.payer.name,
      email: input.payer.email,
      type: "individual",
      document: input.payer.cpf,
      document_type: "CPF",
      phones: { mobile_phone: splitPhone(input.payer.phone) },
    },
    items: [{ amount: input.amountCents, description: input.description || "Pagamento", quantity: 1, code: "jpix" }],
    payments: [{ payment_method: "pix", pix: { expires_in: input.expiresInSeconds }, ...(input.split?.length ? { split: input.split } : {}) }],
    metadata: { jpix_charge_id: input.chargeId, jpix_client_id: input.clientId },
  };

  const order = await request<OrderResponse>("/orders", { method: "POST", body: JSON.stringify(body) });
  const charge = order.charges?.[0];
  const tx = charge?.last_transaction;
  if (!charge || !tx?.qr_code) {
    throw new PagarmeError("Pagar.me não retornou o QR Code do Pix", 502, order);
  }
  return {
    orderId: order.id,
    chargeId: charge.id,
    status: order.status,
    qrCode: tx.qr_code,
    qrCodeUrl: tx.qr_code_url ?? null,
    expiresAt: tx.expires_at ? new Date(tx.expires_at) : expiresAt,
  };
}

export async function getOrder(orderId: string) {
  return request<OrderResponse>(`/orders/${orderId}`);
}

export async function testConnection(key?: string) {
  const k = key ?? (await getSecretKey());
  const res = await fetch(`${BASE}/customers?size=1`, {
    headers: { Authorization: `Basic ${Buffer.from(`${k}:`).toString("base64")}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.ok) return;
  throw new PagarmeError(authErrorMessage(res.status) ?? `Pagar.me HTTP ${res.status}`, res.status, null);
}

// Erros 422 vêm como { message, errors: { "campo": ["motivo"] } }; os campos dizem o que corrigir.
function describeError(body: unknown) {
  const b = body as { message?: string; errors?: Record<string, string[] | string> } | null;
  if (!b || typeof b !== "object") return null;
  const details = b.errors ? Object.entries(b.errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`) : [];
  if (!b.message && !details.length) return null;
  return [b.message, ...details].filter(Boolean).join(" | ");
}

// Códigos documentados em docs.pagar.me/reference/erros-1
function authErrorMessage(status: number) {
  if (status === 401) return "Chave de API inválida";
  if (status === 403) return "Bloqueio por IP: o IP deste servidor não está no IP Allowlist da conta. Adicione-o no Dash da Pagar.me (configurações da Account/Merchant).";
  return null;
}

export type PagarmeRecipient = { id: string; name: string; email: string | null; document: string | null; type: string | null; status: string | null };

/** Todos os recebedores da conta (paginado de 100 em 100, até 2.000). */
export async function listRecipients(): Promise<PagarmeRecipient[]> {
  const out: PagarmeRecipient[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await request<{ data?: Record<string, unknown>[] }>(`/recipients?page=${page}&size=100`);
    const data = res.data ?? [];
    for (const r of data) {
      out.push({
        id: String(r.id),
        name: String(r.name ?? r.id),
        email: (r.email as string) ?? null,
        document: (r.document as string) ?? null,
        type: (r.type as string) ?? null,
        status: (r.status as string) ?? null,
      });
    }
    if (data.length < 100) break;
  }
  return out;
}

export const RECIPIENTS_TAG = "pagarme-recipients";

/** Lista em cache por 5 min: a Pagar.me fica longe do servidor e a lista muda pouco. Invalidar com RECIPIENTS_TAG. */
export const listRecipientsCached = unstable_cache(listRecipients, ["pagarme-recipients"], { tags: [RECIPIENTS_TAG], revalidate: 300 });

export type RecipientBalance = { available: number; waiting: number; transferred: number };

/** GET /recipients/{id}/balance (docs.pagar.me/reference/obter-saldo). Valores em centavos. */
export async function getRecipientBalance(recipientId: string): Promise<RecipientBalance> {
  const r = await request<{ available_amount?: number; waiting_funds_amount?: number; transferred_amount?: number }>(`/recipients/${encodeURIComponent(recipientId)}/balance`);
  return { available: r.available_amount ?? 0, waiting: r.waiting_funds_amount ?? 0, transferred: r.transferred_amount ?? 0 };
}

export type TransferResult = { id: string; status: string | null; amount: number; fee: number | null; fundingEstimatedDate: string | null };

/**
 * Saque do saldo do recebedor para a conta bancária dele: POST /recipients/{id}/transfers, como no SDK oficial da v5
 * (pagarme-core-api, RecipientsController.createTransfer). O POST /transfers solto devolve 401 com chave de conta.
 * A Idempotency-Key evita saque duplicado em reenvio.
 */
export async function createTransfer(recipientId: string, amountCents: number, idempotencyKey: string): Promise<TransferResult> {
  const r = await request<{ id: string; status?: string; amount?: number; fee?: number; funding_estimated_date?: string }>(`/recipients/${encodeURIComponent(recipientId)}/transfers`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ amount: amountCents }),
  });
  return { id: r.id, status: r.status ?? null, amount: r.amount ?? amountCents, fee: r.fee ?? null, fundingEstimatedDate: r.funding_estimated_date ?? null };
}

/** Corpo no formato de docs.pagar.me/reference/criar-recebedor-1 (montado em recipient-input.ts). */
export async function createRecipient(body: unknown) {
  const r = await request<{ id: string; status?: string }>("/recipients", { method: "POST", body: JSON.stringify(body) });
  return { id: r.id, status: r.status ?? null };
}

/** Link da prova de vida (KYC) que o recebedor abre para validar a identidade. Expira em 20 minutos. */
export async function createRecipientKycLink(recipientId: string) {
  const r = await request<{ url?: string; base64_qrcode?: string; expire_at?: string }>(`/recipients/${encodeURIComponent(recipientId)}/kyc_link`, { method: "POST" });
  if (!r.url) throw new PagarmeError("A Pagar.me não devolveu o link da prova de vida", 502, r);
  return { url: r.url, qrBase64: r.base64_qrcode ?? null, expiresAt: r.expire_at ?? null };
}

export async function cancelPagarmeCharge(chargeId: string) {
  return request(`/charges/${chargeId}`, { method: "DELETE" });
}

export function keyEnvironment(key: string) {
  if (key.startsWith("sk_test_")) return "test" as const;
  if (key.startsWith("sk_")) return "live" as const;
  return null;
}
