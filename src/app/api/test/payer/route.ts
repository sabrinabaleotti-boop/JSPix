import { NextResponse } from "next/server";
import { getRandomTestPayer, getTestPayerByIndex, getTestPayerByCpf, getTestPoolSize } from "@/lib/test-pool";

/**
 * GET /api/test/payer - Retorna um pagador da pool de testes
 *
 * Query params:
 * - ?random - (padrão) retorna um CPF aleatório
 * - ?index=N - retorna o N-ésimo CPF (0-231)
 * - ?cpf=XXX - busca por CPF (com ou sem máscara)
 * - ?size - retorna o tamanho da pool
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Retorna o tamanho da pool
  if (searchParams.has("size")) {
    return NextResponse.json({ size: getTestPoolSize() });
  }

  // Busca por CPF
  if (searchParams.has("cpf")) {
    const cpf = searchParams.get("cpf")!;
    const payer = getTestPayerByCpf(cpf);
    if (!payer) {
      return NextResponse.json({ error: "CPF não encontrado na pool" }, { status: 404 });
    }
    return NextResponse.json(payer);
  }

  // Busca por índice
  if (searchParams.has("index")) {
    const index = parseInt(searchParams.get("index")!);
    if (isNaN(index)) {
      return NextResponse.json({ error: "index deve ser um número" }, { status: 400 });
    }
    try {
      const payer = getTestPayerByIndex(index);
      return NextResponse.json(payer);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  // Padrão: aleatório
  return NextResponse.json(getRandomTestPayer());
}
