import { createTransfer, getRecipientBalance, listRecipientsCached, type TransferResult } from "@/lib/pagarme";
import { getSetting } from "@/lib/settings";
import { formatBRL } from "@/lib/utils";

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

/** Valida, confere o saldo na hora (o da tela pode estar velho) e cria a transferência. Quem chama checa a sessão. */
export async function withdraw(recipientId: string, amountCents: number, idempotencyKey: string): Promise<WithdrawState> {
  if (!/^r[ep]_[A-Za-z0-9]+$/.test(recipientId)) return { error: "Recebedor inválido" };
  if (!Number.isInteger(amountCents) || amountCents < 1) return { error: "Informe um valor maior que zero" };
  if (!/^[A-Za-z0-9-]{8,64}$/.test(idempotencyKey)) return { error: "Requisição inválida. Recarregue a página." };
  try {
    const [balance, fee] = await Promise.all([getRecipientBalance(recipientId), getWithdrawFee()]);
    const max = maxWithdraw(balance.available, fee);
    if (amountCents > max) {
      return { error: fee ? `O máximo é ${formatBRL(max)}: saldo de ${formatBRL(balance.available)} menos a tarifa de ${formatBRL(fee)}.` : `Saldo disponível é ${formatBRL(balance.available)}` };
    }
    return { transfer: await createTransfer(recipientId, amountCents, idempotencyKey) };
  } catch (e) {
    const msg = (e as Error).message;
    // A Pagar.me não diz o motivo; o caso mais comum é o valor mais a tarifa passar do saldo.
    if (/withdraw could not be created/i.test(msg)) return { error: "A Pagar.me recusou o saque. Normalmente a tarifa não coube no saldo: tente um valor menor ou ajuste a tarifa de saque em Configurações → Taxas." };
    return { error: msg };
  }
}
