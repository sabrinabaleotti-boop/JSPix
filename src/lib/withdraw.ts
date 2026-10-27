import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { BALANCE_TAG, createTransfer, getRecipientBalance, getRecipientBalanceCached, listRecipientsCached, listRecipientWithdrawals, type RemoteWithdrawal, type TransferResult } from "@/lib/pagarme";
import { getSetting } from "@/lib/settings";
import { formatBRL } from "@/lib/utils";
import type { Prisma, Withdrawal } from "@prisma/client";

/** Tarifa por saque (centavos). A Pagar.me tira do saldo além do valor sacado: um saque do saldo inteiro é recusado. */
export async function getWithdrawFee() {
  const n = Number(await getSetting("withdraw_fee_cents"));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function maxWithdraw(available: number, fee: number) {
  return Math.max(0, available - fee);
}

export { WITHDRAWAL_STATUS, FINAL_WITHDRAWAL_STATUSES, normalizeWithdrawalStatus } from "@/lib/withdrawal-status";
export type { WithdrawRecipient, WithdrawState, WithdrawalStatus, WithdrawalDTO } from "@/lib/withdrawal-status";
import { WITHDRAWAL_STATUS, normalizeWithdrawalStatus, type WithdrawRecipient, type WithdrawState, type WithdrawalStatus, type WithdrawalDTO } from "@/lib/withdrawal-status";

/** Recebedores da conta com saldo (cache de 20 s), do maior disponível para o menor. */
export async function loadWithdrawRecipients(): Promise<{ recipients: WithdrawRecipient[]; error: string | null }> {
  try {
    const list = await listRecipientsCached();
    const recipients = await Promise.all(
      list.map(async (r) => {
        try {
          const b = await getRecipientBalanceCached(r.id);
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
    revalidateTag(BALANCE_TAG, "max");
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

const SYNC_EVERY_MS = 20_000;
const TWIN_WINDOW_MS = 180_000;
let lastSync = 0;

/**
 * Importa da Pagar.me os saques de todos os recebedores e atualiza o status dos conhecidos, em lote: a listagem já
 * traz a situação atual de cada saque, então são 2 chamadas à Pagar.me (em paralelo) e 2 a 4 consultas ao banco,
 * independentemente de quantos saques existam. Saques feitos fora do app entram sem cliente (clientId null).
 * Roda no máximo a cada 20 s por processo e nunca derruba a página.
 */
export async function syncWithdrawalsFromPagarme(force = false) {
  if (!force && Date.now() - lastSync < SYNC_EVERY_MS) return;
  lastSync = Date.now();
  try {
    const recipients = await listRecipientsCached();
    const lists = await Promise.all(
      recipients.map(async (r) => ({
        r,
        remote: await listRecipientWithdrawals(r.id).catch((e) => {
          console.error("[withdraw] não foi possível listar saques do recebedor", r.id, (e as Error).message);
          return [] as RemoteWithdrawal[];
        }),
      })),
    );
    const all = lists.flatMap(({ r, remote }) => remote.map((w) => ({ r, w })));
    if (all.length === 0) return;

    const ids = all.map(({ w }) => w.id);
    const known = await db.withdrawal.findMany({ where: { gatewayId: { in: ids } } });
    const byId = new Map(known.map((k) => [k.gatewayId, k]));

    // A Pagar.me pode devolver um saque criado pelo app com outro id (tr_ x with_): casa pelo recebedor, valor e horário.
    const unknown = all.filter(({ w }) => !byId.has(w.id));
    const times = unknown.map(({ w }) => (w.createdAt ? Date.parse(w.createdAt) : NaN)).filter(Number.isFinite);
    const twins: Withdrawal[] =
      times.length > 0
        ? await db.withdrawal.findMany({
            where: {
              gatewayId: { notIn: ids },
              recipientId: { in: [...new Set(unknown.map(({ r }) => r.id))] },
              createdAt: { gte: new Date(Math.min(...times) - TWIN_WINDOW_MS), lte: new Date(Math.max(...times) + TWIN_WINDOW_MS) },
            },
          })
        : [];

    const creates: Prisma.WithdrawalCreateManyInput[] = [];
    const updates: Promise<unknown>[] = [];
    for (const { r, w } of all) {
      const status = normalizeWithdrawalStatus(w.status);
      const fee = w.fee ?? null;
      const funding = w.fundingEstimatedDate ? new Date(w.fundingEstimatedDate) : null;
      const failure = status === "failed" ? (w.failureReason ?? null) : null;
      const createdAt = w.createdAt ? new Date(w.createdAt) : null;

      let row = byId.get(w.id);
      if (!row && createdAt) {
        const i = twins.findIndex((c) => c.recipientId === r.id && c.amountCents === w.amount && Math.abs(c.createdAt.getTime() - createdAt.getTime()) <= TWIN_WINDOW_MS);
        if (i >= 0) row = twins.splice(i, 1)[0];
      }
      if (row) {
        const changed =
          row.status !== status ||
          (fee != null && row.feeCents !== fee) ||
          (funding != null && row.fundingEstimatedDate?.getTime() !== funding.getTime()) ||
          (failure != null && row.failureReason !== failure);
        if (changed) {
          updates.push(
            db.withdrawal.update({
              where: { id: row.id },
              data: { status, ...(fee != null ? { feeCents: fee } : {}), ...(funding ? { fundingEstimatedDate: funding } : {}), ...(failure ? { failureReason: failure } : {}) },
            }),
          );
        }
        continue;
      }
      creates.push({
        clientId: null,
        recipientId: r.id,
        recipientName: r.name,
        amountCents: w.amount,
        feeCents: fee ?? 0,
        status,
        gatewayId: w.id,
        fundingEstimatedDate: funding,
        failureReason: failure,
        ...(createdAt ? { createdAt } : {}),
      });
    }
    if (creates.length > 0) await db.withdrawal.createMany({ data: creates, skipDuplicates: true });
    await Promise.all(updates);
  } catch (e) {
    console.error("[withdraw] sincronização com a Pagar.me falhou:", (e as Error).message);
  }
}

export type WithdrawalRow = Withdrawal & { client: { name: string } | null };

/** O cliente vê os saques que pediu e os importados da Pagar.me (sem cliente). */
export function withdrawalScope(clientId: string | null) {
  return clientId ? { OR: [{ clientId }, { clientId: null }] } : {};
}

/** Histórico de saques do banco (do cliente ou, sem clientId, de toda a conta). Sincronize antes com syncWithdrawalsFromPagarme. */
export function listWithdrawals(clientId: string | null, take = 50): Promise<WithdrawalRow[]> {
  return db.withdrawal.findMany({ where: withdrawalScope(clientId), orderBy: { createdAt: "desc" }, take, include: { client: { select: { name: true } } } });
}

export function serializeWithdrawal(w: WithdrawalRow): WithdrawalDTO {
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
