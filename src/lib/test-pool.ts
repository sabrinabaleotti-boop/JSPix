import testPoolData from './test-pool.json';

export type TestPayerData = {
  cpf: string;
  nome: string;
  email: string;
  phone: string;
};

const testPool: TestPayerData[] = testPoolData;

/** Pega um registro aleatório da pool de testes */
export function getRandomTestPayer(): TestPayerData {
  return testPool[Math.floor(Math.random() * testPool.length)]!;
}

/** Pega um registro específico por índice (0-231) */
export function getTestPayerByIndex(index: number): TestPayerData {
  if (index < 0 || index >= testPool.length) {
    throw new Error(`Índice fora do intervalo: ${index} (pool tem ${testPool.length} registros)`);
  }
  return testPool[index]!;
}

/** Busca um registro por CPF (com ou sem máscara) */
export function getTestPayerByCpf(cpf: string): TestPayerData | undefined {
  const cleanCpf = cpf.replace(/\D/g, '');
  return testPool.find(p => p.cpf.replace(/\D/g, '') === cleanCpf);
}

/** Retorna a quantidade de registros na pool */
export function getTestPoolSize(): number {
  return testPool.length;
}

/** Retorna um slice da pool (para paginar em testes) */
export function getTestPayerBatch(start: number, limit: number): TestPayerData[] {
  return testPool.slice(start, start + limit);
}

// Export da pool completa para casos especiais
export const testPoolExport = testPool;
