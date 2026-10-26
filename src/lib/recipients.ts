import { getSecretKey, listRecipientsCached } from "@/lib/pagarme";
import type { RecipientOption } from "@/components/admin/split-editor";

/** Recebedores da conta Pagar.me para o editor de split, ou o motivo de não ter conseguido listar. */
export async function loadRecipients(): Promise<{ recipients: RecipientOption[]; error: string | null }> {
  if (!(await getSecretKey())) return { recipients: [], error: "Configure a chave da Pagar.me para listar os recebedores da conta." };
  try {
    const list = await listRecipientsCached();
    return { recipients: list.map((r) => ({ id: r.id, name: r.name, document: r.document, status: r.status })), error: list.length ? null : "A conta não tem recebedores cadastrados." };
  } catch (e) {
    return { recipients: [], error: `Não foi possível listar os recebedores: ${(e as Error).message}` };
  }
}
