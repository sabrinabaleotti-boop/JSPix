import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getSetting, setSetting } from "@/lib/settings";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

/** Cliente da API da Legacy Ecom. Docs: https://developers.legacyecombrasil.com */
const BASE = "https://api.legacyecom.com.br";

export class LegacyError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

function safeDecrypt(v: string) {
  try {
    return v ? decryptSecret(v) : "";
  } catch {
    return "";
  }
}

/** Credenciais: variáveis de ambiente têm prioridade sobre o que foi salvo no admin. */
export async function getLegacyCredentials() {
  const envPk = process.env.LEGACY_PUBLIC_KEY?.trim();
  const envSk = process.env.LEGACY_SECRET_KEY?.trim();
  if (envPk && envSk) return { publicKey: envPk, secretKey: envSk, source: "env" as const };
  const publicKey = await getSetting("legacy_public_key");
  const secretKey = safeDecrypt(await getSetting("legacy_secret_enc"));
  if (publicKey && secretKey) return { publicKey, secretKey, source: "db" as const };
  return null;
}

export async function getLegacyWebhookSecret() {
  return process.env.LEGACY_WEBHOOK_SECRET?.trim() || safeDecrypt(await getSetting("legacy_webhook_secret_enc"));
}

/** Token secreto que vai na webhookUrl de cada cobrança, para recusar chamadas de terceiros. */
export async function getLegacyWebhookToken() {
  let token = await getSetting("legacy_webhook_token");
  if (!token) {
    token = randomBytes(24).toString("base64url");
    await setSetting("legacy_webhook_token", token);
  }
  return token;
}

async function request<T>(path: string, init: RequestInit = {}, creds?: { publicKey: string; secretKey: string }) {
  const c = creds ?? (await getLegacyCredentials());
  if (!c) throw new LegacyError("Credenciais da Legacy não configuradas", 0);
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${c.publicKey}:${c.secretKey}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const code = typeof body.error === "string" ? body.error : undefined;
    const msg = typeof body.message === "string" ? body.message : `Legacy HTTP ${res.status}`;
    throw new LegacyError(code ? `${code}: ${msg}` : msg, res.status, code);
  }
  return body as T;
}

// ---------- Payins ----------

export type LegacyPayinStatus = "PENDING" | "APPROVED" | "REFUSED" | "FAILED" | "CANCELED" | "REFUNDED" | "CHARGEBACK" | "MED" | "EXPIRED";

type PayinCreated = { id: string; status: LegacyPayinStatus; amount: number; pix?: { qrcode?: string } };
export type LegacyPayin = {
  id: string;
  referenceId: string | null;
  status: LegacyPayinStatus;
  amount: number;
  pixCopyAndPaste: string | null;
  netAmount: number | null;
  updatedAt: string;
};

export type LegacyAddress = { street: string; number: string; zipCode: string; city: string; state: string; complement?: string; neighborhood?: string };

export async function createLegacyPix(input: {
  referenceId: string;
  amountCents: number;
  description: string;
  payerIp: string;
  webhookUrl: string;
  customer: { name: string; document: string; email: string; phone: string; address: LegacyAddress };
}) {
  const body = {
    paymentMethod: "PIX",
    amount: input.amountCents,
    referenceId: input.referenceId,
    webhookUrl: input.webhookUrl,
    isPhysicalProduct: false,
    payerIp: input.payerIp,
    customer: { ...input.customer, phone: `55${input.customer.phone}` },
    items: [{ title: input.description || "Pagamento", quantity: 1, unitPrice: input.amountCents }],
  };
  const res = await request<PayinCreated>("/payin", { method: "POST", body: JSON.stringify(body) });
  if (!res.pix?.qrcode) throw new LegacyError("A Legacy não retornou o código Pix", 502);
  return { id: res.id, status: res.status, qrCode: res.pix.qrcode };
}

export async function getLegacyPayin(id: string) {
  return request<LegacyPayin>(`/payin/${encodeURIComponent(id)}`);
}

// ---------- Payouts ----------

export type LegacyPayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUSED" | "AWAITING_APPROVAL";
export type LegacyPayout = { id: string; status: LegacyPayoutStatus; amount: number; feeAmount: number | null; netAmount: number | null; referenceId: string };
export const PIX_KEY_TYPES = ["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export async function createLegacyPayout(input: {
  amountCents: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  referenceId: string;
  beneficiaryName?: string;
  webhookUrl: string;
}) {
  return request<LegacyPayout>("/payout", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountCents,
      pixKey: input.pixKey,
      pixKeyType: input.pixKeyType,
      referenceId: input.referenceId,
      beneficiaryName: input.beneficiaryName,
      webhookUrl: input.webhookUrl,
    }),
  });
}

export async function getLegacyPayout(id: string) {
  return request<LegacyPayout>(`/payout/${encodeURIComponent(id)}`);
}

export async function getLegacyBalance() {
  return request<{ amount: number; currency: string; updatedAt: string }>("/balances");
}

// ---------- Conta ----------

export type LegacyWhoami = { companyName: string; tradeName?: string | null; kycStatus: string; blocked: boolean; canTransact: boolean; reason: string | null; paymentMethods: string[] };

export async function legacyWhoami(creds?: { publicKey: string; secretKey: string }) {
  return request<LegacyWhoami>("/whoami", {}, creds);
}

export async function saveLegacyCredentials(publicKey: string, secretKey: string) {
  await setSetting("legacy_public_key", publicKey);
  await setSetting("legacy_secret_enc", encryptSecret(secretKey));
}

// ---------- Webhook ----------

/** Valida X-Webhook-Signature: t=<unix>,v1=<hmac>[,v1=<hmac antigo>] sobre "<t>.<corpo bruto>". */
export function verifyLegacySignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300) {
  if (!header) return false;
  let t = NaN;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t") t = Number(v);
    if (k === "v1") sigs.push(v);
  }
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex"));
  return sigs.some((s) => {
    const b = Buffer.from(s);
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}
