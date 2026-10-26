import { db } from "@/lib/db";
import { getLegacyPayout, type LegacyPayoutStatus } from "@/lib/legacy";

/** Repasses que contam como "já repassado": tudo menos os que falharam (a Legacy devolve o saldo nesse caso). */
export const COUNTED_PAYOUT_STATUSES = ["completed", "pending", "processing", "awaiting_approval"];

export const PAYOUT_STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "neutral" }> = {
  completed: { label: "Concluído", variant: "success" },
  pending: { label: "Enviado", variant: "warning" },
  processing: { label: "Processando", variant: "warning" },
  awaiting_approval: { label: "Aguardando aprovação", variant: "warning" },
  failed: { label: "Falhou", variant: "destructive" },
};

const LEGACY_MAP: Record<LegacyPayoutStatus, string> = {
  PENDING: "pending",
  PROCESSING: "processing",
  AWAITING_APPROVAL: "awaiting_approval",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUSED: "failed",
};

export function mapLegacyPayoutStatus(s: LegacyPayoutStatus) {
  return LEGACY_MAP[s] ?? "pending";
}

/** Reconsulta um repasse feito pela Legacy e atualiza o status local. */
export async function refreshPayout(id: string) {
  const p = await db.payout.findUniqueOrThrow({ where: { id } });
  if (p.method !== "legacy" || !p.gatewayId) return p;
  const remote = await getLegacyPayout(p.gatewayId);
  const status = mapLegacyPayoutStatus(remote.status);
  if (status === p.status) return p;
  return db.payout.update({
    where: { id },
    data: {
      status,
      ...(status === "completed" ? { paidAt: new Date() } : {}),
      ...(status === "failed" ? { failureReason: `Legacy: ${remote.status}` } : {}),
    },
  });
}
