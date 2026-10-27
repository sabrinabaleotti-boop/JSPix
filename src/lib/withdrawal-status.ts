import type { TransferResult } from "@/lib/pagarme";

/** Tipos e rótulos de saque usados tanto no servidor quanto nos componentes de cliente (sem código de servidor aqui). */

export type WithdrawRecipient = {
  id: string;
  name: string;
  document: string | null;
  status: string | null;
  available: number;
  waiting: number;
  balanceError: string | null;
};

export type WithdrawState = { error?: string; transfer?: TransferResult };

export type WithdrawalStatus = "pending_transfer" | "processing" | "transferred" | "failed" | "canceled";

export const WITHDRAWAL_STATUS: Record<WithdrawalStatus, { label: string; short: string; variant: "success" | "warning" | "destructive" | "neutral" | "primary"; step: number }> = {
  pending_transfer: { label: "Aguardando transferência", short: "Solicitado", variant: "warning", step: 1 },
  processing: { label: "Processando no banco", short: "Processando", variant: "primary", step: 2 },
  transferred: { label: "Transferido para a conta", short: "Concluído", variant: "success", step: 3 },
  failed: { label: "Falhou", short: "Falhou", variant: "destructive", step: 3 },
  canceled: { label: "Cancelado", short: "Cancelado", variant: "neutral", step: 3 },
};

export const FINAL_WITHDRAWAL_STATUSES: WithdrawalStatus[] = ["transferred", "failed", "canceled"];

/** Normaliza o status que a Pagar.me devolve (varia entre "pending" e "pending_transfer" conforme a rota). */
export function normalizeWithdrawalStatus(s: string | null | undefined): WithdrawalStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "transferred" || v === "paid" || v === "completed") return "transferred";
  if (v === "processing" || v === "in_progress") return "processing";
  if (v === "failed" || v === "refused" || v === "error") return "failed";
  if (v === "canceled" || v === "cancelled") return "canceled";
  return "pending_transfer";
}

export type WithdrawalDTO = {
  id: string;
  clientName: string | null;
  recipientName: string;
  amountCents: number;
  feeCents: number;
  status: WithdrawalStatus;
  gatewayId: string;
  createdAt: string;
  updatedAt: string;
  fundingEstimatedDate: string | null;
  failureReason: string | null;
};
