# Pool de CPFs para Testes

A pool contém **232 CPFs reais e válidos** extraídos de um arquivo autorizado, com nomes, emails (gerados) e telefones válidos para testes do JPix.

## Arquivos

- `src/lib/test-pool.json` - Pool de 232 registros em JSON
- `src/lib/test-pool.ts` - Utilitários TypeScript para acessar a pool
- `src/app/api/test/payer/route.ts` - Endpoint API para testes

## Uso

### 1. **Pela API REST** (Recomendado para testes de E2E)

```bash
# Pega um CPF aleatório
curl http://localhost:3000/api/test/payer

# Pega um CPF específico por índice (0-231)
curl http://localhost:3000/api/test/payer?index=0

# Busca por CPF
curl http://localhost:3000/api/test/payer?cpf=069.673.078-27

# Retorna o tamanho da pool
curl http://localhost:3000/api/test/payer?size
```

**Resposta:**
```json
{
  "cpf": "069.673.078-27",
  "nome": "APARECIDA PEREIRA NUNES",
  "email": "aparecida.pereira@testjpix.dev",
  "phone": "19997444166"
}
```

### 2. **Em Testes TypeScript**

```typescript
import { getRandomTestPayer, getTestPayerByIndex, getTestPayerByCpf } from "@/lib/test-pool";

// CPF aleatório
const payer = getRandomTestPayer();
console.log(payer.cpf); // "069.673.078-27"

// Índice específico
const payer = getTestPayerByIndex(0);

// Busca por CPF
const payer = getTestPayerByCpf("069.673.078-27");
```

### 3. **Em Componentes React**

```typescript
"use client";

import { useEffect, useState } from "react";

export function TestPayerForm() {
  const [payer, setPayer] = useState(null);

  useEffect(() => {
    fetch("/api/test/payer")
      .then(r => r.json())
      .then(setPayer);
  }, []);

  if (!payer) return <div>Carregando...</div>;

  return (
    <form>
      <input defaultValue={payer.nome} />
      <input defaultValue={payer.cpf} />
      <input defaultValue={payer.email} />
      <input defaultValue={payer.phone} />
    </form>
  );
}
```

## Dados

Cada registro contém:
- **cpf**: CPF válido com máscara (069.673.078-27)
- **nome**: Nome completo
- **email**: Email gerado no formato `primeiro.segundo@testjpix.dev`
- **phone**: Telefone válido de 10-11 dígitos (sem máscara)

## Observações

- Todos os CPFs passam pela validação `isValidCpf()` do projeto
- Emails são inventados (domínio `@testjpix.dev` para identificar testes)
- Telefones foram extraídos dos dados originais ou gerados como fallback
- A pool é **somente para testes** — nunca usar em produção
- Todos os 232 CPFs são distintos e sequenciais (índice 0-231)

## Exemplos de Uso

### Teste de Geração de PIX
```typescript
const payer = getRandomTestPayer();
const charge = await createPixOrder({
  amountCents: 10000, // R$ 100,00
  description: "Teste",
  payer,
  // ...
});
```

### Teste com Índice Sequencial
```typescript
for (let i = 0; i < 10; i++) {
  const payer = getTestPayerByIndex(i);
  // gerar 10 PIX com CPFs diferentes
}
```

### Teste de Busca
```typescript
const payer = getTestPayerByCpf("069.673.078-27");
if (payer) {
  // CPF encontrado na pool
}
```
