-- Split de pagamento: configuração por cliente e cópia das regras usadas em cada cobrança
ALTER TABLE "Client" ADD COLUMN "splitConfig" JSONB;
ALTER TABLE "Charge" ADD COLUMN "splitRules" JSONB;
