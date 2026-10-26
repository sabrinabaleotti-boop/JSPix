-- Charge: colunas da Pagar.me viram genéricas, para suportar mais de uma gateway
ALTER TABLE "Charge" RENAME COLUMN "pagarmeOrderId" TO "gatewayId";
ALTER TABLE "Charge" RENAME COLUMN "pagarmeChargeId" TO "gatewayChargeId";
ALTER INDEX "Charge_pagarmeOrderId_key" RENAME TO "Charge_gatewayId_key";
ALTER TABLE "Charge" ADD COLUMN "gateway" TEXT NOT NULL DEFAULT 'pagarme';
UPDATE "Charge" SET "gateway" = 'simulated' WHERE "gatewayId" LIKE 'or_sim_%';

-- Client: endereço do pagador (exigido pela Legacy) e tipo da chave Pix de repasse
ALTER TABLE "Client" ADD COLUMN "payerStreet" TEXT,
ADD COLUMN "payerNumber" TEXT,
ADD COLUMN "payerComplement" TEXT,
ADD COLUMN "payerNeighborhood" TEXT,
ADD COLUMN "payerZip" TEXT,
ADD COLUMN "payerCity" TEXT,
ADD COLUMN "payerState" TEXT,
ADD COLUMN "payoutPixKeyType" TEXT;

-- Payout: repasse manual ou via Pix da Legacy, com status
ALTER TABLE "Payout" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed',
ADD COLUMN "gatewayId" TEXT,
ADD COLUMN "pixKey" TEXT,
ADD COLUMN "pixKeyType" TEXT,
ADD COLUMN "failureReason" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "Payout_gatewayId_key" ON "Payout"("gatewayId");
CREATE INDEX "Payout_clientId_status_idx" ON "Payout"("clientId", "status");
