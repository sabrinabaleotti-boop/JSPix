-- Dados do pagador saíram do cadastro do cliente (a cobrança usa a pool de testes).
-- Já aplicado direto no banco antes; DROP NOT NULL não falha se a coluna já aceita nulo.
ALTER TABLE "Client" ALTER COLUMN "payerName" DROP NOT NULL,
ALTER COLUMN "payerCpf" DROP NOT NULL,
ALTER COLUMN "payerEmail" DROP NOT NULL,
ALTER COLUMN "payerPhone" DROP NOT NULL;
