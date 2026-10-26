import { db } from "@/lib/db";
import { createTransfer, getRecipientBalance, getTransfer, listRecipientsCached, type TransferResult } from "@/lib/pagarme";
import { getSetting } from "@/lib/settings";
import { formatBRL } from "@/lib/utils";
import type { Withdrawal } from "@prisma/client";

/** Tarifa por saque (centavos). A Pagar.me tira do saldo além do valor sacado: um saque do saldo inteiro é recusado. */
export async function getWithdrawFee() {
  const n = Number(await getSetting("withdraw_fee_cents"));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function maxWithdraw(available: number, fee: number) {
  return Math.max(0, available - fee);
}

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

/** Recebedores da conta com o saldo consultado na hora (sem cache), do maior disponível para o menor. */
export async function loadWithdrawRecipients(): Promise<{ recipients: WithdrawRecipient[]; error: string | null }> {
  try {
    const list = await listRecipientsCached();
    const recipients = await Promise.all(
      list.map(async (r) => {
        try {
          const b = await getRecipientBalance(r.id);
          return { id: r.id, name: r.name, document: r.document, status: r.status, available: b.available, waiting: b.waiting, balanceError: null };
        } catch (e) {
          return { id: r.id, name: r.name, document: r.document, status: r.status, available: 0, waiting: 0, balanceError: (e as Error).message };
        }
      }),
    );
    recipients.sort((a, b) => b.available - a.available);
    return { recipients, error: null };
  } catch (e) {
    return { recipients: [], error: `Não foi possível listar os recebedores: ${(e as Error).message}` };
  }
}

/**
 * Valida, confere o saldo na hora (o da tela pode estar velho) e cria a transferência. Quem chama checa a sessão.
 * O saque fica registrado em Withdrawal para o histórico; se a gravação falhar o saque já aconteceu, então só loga.
 */
export async function withdraw(recipientId: string, amountCents: number, idempotencyKey: string, clientId: string | null = null): Promise<WithdrawState> {
  if (!/^r[ep]_[A-Za-z0-9]+$/.test(recipientId)) return { error: "Recebedor inválido" };
  if (!Number.isInteger(amountCents) || amountCents < 1) return { error: "Informe um valor maior que zero" };
  if (!/^[A-Za-z0-9-]{8,64}$/.test(idempotencyKey)) return { error: "Requisição inválida. Recarregue a página." };
  let fee = 0;
  try {
    const [balance, configuredFee] = await Promise.all([getRecipientBalance(recipientId), getWithdrawFee()]);
    fee = configuredFee;
    const max = maxWithdraw(balance.available, fee);
    if (amountCents > max) {
      return { error: fee ? `O máximo é ${formatBRL(max)}: saldo de ${formatBRL(balance.available)} menos a tarifa de ${formatBRL(fee)}.` : `Saldo disponível é ${formatBRL(balance.available)}` };
    }
    const transfer = await createTransfer(recipientId, amountCents, idempotencyKey);
    await recordWithdrawal(transfer, recipientId, clientId, fee);
    return { transfer };
  } catch (e) {
    const msg = (e as Error).message;
    // A Pagar.me não diz o motivo; o caso mais comum é o valor mais a tarifa passar do saldo.
    if (/withdraw could not be created/i.test(msg)) return { error: "A Pagar.me recusou o saque. Normalmente a tarifa não coube no saldo: tente um valor menor ou ajuste a tarifa de saque em Configurações → Taxas." };
    return { error: msg };
  }
}

async function recordWithdrawal(t: TransferResult, recipientId: string, clientId: string | null, configuredFee: number) {
  try {
    const name = (await listRecipientsCached().catch(() => []))?.find((r) => r.id === recipientId)?.name ?? recipientId;
    await db.withdrawal.upsert({
      where: { gatewayId: t.id },
      update: {},
      create: {
        clientId,
        recipientId,
        recipientName: name,
        amountCents: t.amount,
        feeCents: t.fee ?? configuredFee,
        status: normalizeWithdrawalStatus(t.status),
        gatewayId: t.id,
        fundingEstimatedDate: t.fundingEstimatedDate ? new Date(t.fundingEstimatedDate) : null,
      },
    });
  } catch (e) {
    console.error("[withdraw] saque criado na Pagar.me mas não registrado no histórico:", t.id, (e as Error).message);
  }
}

const REFRESH_AFTER_MS = 60_000;

export type WithdrawalRow = Withdrawal & { client: { name: string } | null };

/**
 * Histórico de saques (do cliente ou, sem clientId, de toda a conta). Os que ainda não terminaram são reconsultados
 * na Pagar.me, no máximo uma vez por minuto cada, para o status acompanhar o banco.
 */
export async function listWithdrawals(clientId: string | null, take = 50): Promise<WithdrawalRow[]> {
  const where = clientId ? { clientId } : {};
  const items = await db.withdrawal.findMany({ where, orderBy: { createdAt: "desc" }, take, include: { client: { select: { name: true } } } });
  const stale = items.filter((w) => !FINAL_WITHDRAWAL_STATUSES.includes(w.status as WithdrawalStatus) && Date.now() - w.updatedAt.getTime() > REFRESH_AFTER_MS).slice(0, 10);
  if (stale.length === 0) return items;
  const refreshed = await Promise.all(stale.map((w) => refreshWithdrawal(w).then((r) => ({ ...r, client: w.client })).catch(() => w)));
  return items.map((w) => refreshed.find((r) => r.id === w.id) ?? w);
}

export function serializeWithdrawal(w: WithdrawalRow) {
  return {
    id: w.id,
    clientName: w.client?.name ?? null,
    recipientName: w.recipientName,
    amountCents: w.amountCents,
    feeCents: w.feeCents,
    status: (WITHDRAWAL_STATUS[w.status as WithdrawalStatus] ? w.status : "pending_transfer") as WithdrawalStatus,
    gatewayId: w.gatewayId,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
    fundingEstimatedDate: w.fundingEstimatedDate?.toISOString() ?? null,
    failureReason: w.failureReason,
  };
}

export type WithdrawalDTO = ReturnType<typeof serializeWithdrawal>;

export async function refreshWithdrawal(w: Withdrawal): Promise<Withdrawal> {
  const remote = await getTransfer(w.recipientId, w.gatewayId, w.amountCents);
  const status = normalizeWithdrawalStatus(remote.status);
  return db.withdrawal.update({
    where: { id: w.id },
    data: {
      status,
      feeCents: remote.fee ?? w.feeCents,
      fundingEstimatedDate: remote.fundingEstimatedDate ? new Date(remote.fundingEstimatedDate) : w.fundingEstimatedDate,
      failureReason: status === "failed" ? (remote.failureReason ?? w.failureReason ?? "Recusado pela Pagar.me") : w.failureReason,
    },
  });
}
