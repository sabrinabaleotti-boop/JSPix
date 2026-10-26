import { db } from "@/lib/db";
import { getTestPayerByIndex, getTestPoolSize } from "@/lib/test-pool";

/**
 * Próximo CPF da pool de testes para o cliente, em rodízio.
 * Um único UPDATE com incremento: uma ida ao banco e sem repetir o CPF em duas cobranças simultâneas.
 */
export async function getNextTestPayerForClient(clientId: string) {
  const { testPoolIndex } = await db.client.update({
    where: { id: clientId },
    data: { testPoolIndex: { increment: 1 } },
    select: { testPoolIndex: true },
  });
  return getTestPayerByIndex((testPoolIndex - 1) % getTestPoolSize());
}
