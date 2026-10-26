import type { Charge, ChargeStatus } from "@prisma/client";
import { getSetting } from "@/lib/settings";
import { cancelPagarmeCharge, createPixOrder, getOrder, getSecretKey as getPagarmeKey } from "@/lib/pagarme";
import { toPagarmeSplit, type SplitRule } from "@/lib/split";
import { createLegacyPix, getLegacyCredentials, getLegacyPayin, getLegacyWebhookToken, type LegacyAddress, type LegacyPayinStatus } from "@/lib/legacy";

export type GatewayName = "pagarme" | "legacy";
export type EffectiveGateway = GatewayName | "simulated";

export const GATEWAY_LABEL: Record<EffectiveGateway, string> = {
  pagarme: "Pagar.me",
  legacy: "Legacy Ecom",
  simulated: "Simulado",
};

/** Gateway escolhida no admin (padrão: Pagar.me). */
export async function getSelectedGateway(): Promise<GatewayName> {
  return (await getSetting("gateway")) === "legacy" ? "legacy" : "pagarme";
}

export async function isConfigured(g: GatewayName) {
  return g === "pagarme" ? !!(await getPagarmeKey()) : !!(await getLegacyCredentials());
}

/** Gateway que realmente vai emitir as cobranças: a escolhida, ou o modo simulado se ela não tiver credenciais. */
export async function getEffectiveGateway(): Promise<EffectiveGateway> {
  // Em paralelo: o banco fica longe do servidor e cada consulta sequencial soma uma viagem.
  const [g, pagarme, legacy] = await Promise.all([getSelectedGateway(), isConfigured("pagarme"), isConfigured("legacy")]);
  return (g === "pagarme" ? pagarme : legacy) ? g : "simulated";
}

export class GatewayInputError extends Error {}

export type CreatePixInput = {
  chargeId: string;
  clientId: string;
  amountCents: number;
  description: string;
  expiresInSeconds: number;
  payer: { name: string; cpf: string; email: string; phone: string; address: LegacyAddress | null };
  payerIp: string;
  baseUrl: string;
  /** Regras de split a aplicar (só a Pagar.me envia; ver resultado `splitRules`). */
  split: SplitRule[] | null;
};

export type CreatePixResult = {
  gateway: EffectiveGateway;
  gatewayId: string;
  gatewayChargeId: string | null;
  qrCode: string;
  qrCodeUrl: string | null;
  expiresAt: Date;
  /** Split efetivamente enviado à gateway (null quando não houve). */
  splitRules: SplitRule[] | null;
};

export async function createPix(input: CreatePixInput): Promise<CreatePixResult> {
  const gateway = await getEffectiveGateway();
  const localExpiry = new Date(Date.now() + input.expiresInSeconds * 1000);

  if (gateway === "simulated") {
    const v = (input.amountCents / 100).toFixed(2);
    return {
      gateway,
      gatewayId: `sim_${input.chargeId}`,
      gatewayChargeId: null,
      qrCode: `00020126580014br.gov.bcb.pix0136${input.chargeId.padEnd(36, "0").slice(0, 36)}52040000530398654${String(v.length).padStart(2, "0")}${v}5802BR5909JPIX DEMO6009SAO PAULO62070503***6304ABCD`,
      qrCodeUrl: null,
      expiresAt: localExpiry,
      splitRules: input.split,
    };
  }

  if (gateway === "pagarme") {
    const r = await createPixOrder({ ...input, payer: input.payer, split: input.split ? toPagarmeSplit(input.split) : undefined });
    return { gateway, gatewayId: r.orderId, gatewayChargeId: r.chargeId, qrCode: r.qrCode, qrCodeUrl: r.qrCodeUrl, expiresAt: r.expiresAt, splitRules: input.split };
  }

  // Legacy: exige endereço; a validade do Pix é definida pela própria Legacy.
  if (!input.payer.address) throw new GatewayInputError("Endereço do pagador não cadastrado. Peça ao administrador para completar o cadastro.");
  const token = await getLegacyWebhookToken();
  const r = await createLegacyPix({
    referenceId: input.chargeId,
    amountCents: input.amountCents,
    description: input.description,
    payerIp: input.payerIp,
    webhookUrl: `${input.baseUrl}/api/webhooks/legacy?token=${token}`,
    customer: { name: input.payer.name, document: input.payer.cpf, email: input.payer.email, phone: input.payer.phone, address: input.payer.address },
  });
  // A documentação da Legacy não descreve o formato do split nem lista recebedores: o split não é enviado.
  return { gateway, gatewayId: r.id, gatewayChargeId: null, qrCode: r.qrCode, qrCodeUrl: null, expiresAt: localExpiry, splitRules: null };
}

export type RemoteState = { status: ChargeStatus; paidAt?: Date; gatewayFeeCents?: number | null };

const LEGACY_STATUS: Record<LegacyPayinStatus, ChargeStatus> = {
  PENDING: "pending",
  APPROVED: "paid",
  EXPIRED: "expired",
  CANCELED: "canceled",
  REFUSED: "failed",
  FAILED: "failed",
  REFUNDED: "refunded",
  CHARGEBACK: "refunded",
  MED: "refunded",
};

/** Consulta o status direto na gateway que emitiu a cobrança. null = não dá para consultar (simulada). */
export async function fetchRemoteState(charge: Pick<Charge, "gateway" | "gatewayId" | "amountCents">): Promise<RemoteState | null> {
  if (!charge.gatewayId || charge.gateway === "simulated") return null;

  if (charge.gateway === "legacy") {
    const p = await getLegacyPayin(charge.gatewayId);
    const status = LEGACY_STATUS[p.status] ?? "pending";
    return {
      status,
      paidAt: status === "paid" ? new Date(p.updatedAt) : undefined,
      gatewayFeeCents: p.netAmount != null ? Math.max(0, p.amount - p.netAmount) : null,
    };
  }

  const order = await getOrder(charge.gatewayId);
  const ch = order.charges?.[0];
  const s = ch?.status ?? order.status;
  const status: ChargeStatus =
    order.status === "paid" || s === "paid" ? "paid" : s === "canceled" ? "canceled" : s === "failed" ? "failed" : s === "refunded" ? "refunded" : "pending";
  return { status, paidAt: ch?.paid_at ? new Date(ch.paid_at) : undefined };
}

/**
 * Cancela na gateway quando ela permite. Pagar.me: cancela a charge.
 * Legacy: não há endpoint de cancelamento, então só a cobrança local muda.
 */
export async function cancelRemote(charge: Pick<Charge, "gateway" | "gatewayChargeId">): Promise<"remote" | "local"> {
  if (charge.gateway === "pagarme" && charge.gatewayChargeId) {
    await cancelPagarmeCharge(charge.gatewayChargeId);
    return "remote";
  }
  return "local";
}
