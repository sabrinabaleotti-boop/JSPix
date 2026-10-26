-- Histórico de saques feitos pela Pagar.me (cliente ou admin).
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "recipientId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_transfer',
    "gatewayId" TEXT NOT NULL,
    "fundingEstimatedDate" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Withdrawal_gatewayId_key" ON "Withdrawal"("gatewayId");
CREATE INDEX "Withdrawal_clientId_createdAt_idx" ON "Withdrawal"("clientId", "createdAt");

ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
