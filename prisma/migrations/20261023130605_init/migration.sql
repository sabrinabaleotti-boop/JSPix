-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('pending', 'paid', 'expired', 'canceled', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "totpSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "feePercent" DECIMAL(5,2),
    "feeFixedCents" INTEGER,
    "defaultExpiryMin" INTEGER,
    "minAmountCents" INTEGER,
    "maxAmountCents" INTEGER,
    "payoutPixKey" TEXT,
    "payerName" TEXT NOT NULL,
    "payerCpf" TEXT NOT NULL,
    "payerEmail" TEXT NOT NULL,
    "payerPhone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT,
    "payerName" TEXT NOT NULL,
    "payerCpf" TEXT NOT NULL,
    "payerEmail" TEXT NOT NULL,
    "payerPhone" TEXT NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'pending',
    "pagarmeOrderId" TEXT,
    "pagarmeChargeId" TEXT,
    "qrCode" TEXT,
    "qrCodeUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "feePercent" DECIMAL(5,2) NOT NULL,
    "feeFixedCents" INTEGER NOT NULL DEFAULT 0,
    "ourFeeCents" INTEGER NOT NULL DEFAULT 0,
    "gatewayFeeCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_accessCode_key" ON "Client"("accessCode");

-- CreateIndex
CREATE UNIQUE INDEX "Charge_pagarmeOrderId_key" ON "Charge"("pagarmeOrderId");

-- CreateIndex
CREATE INDEX "Charge_clientId_status_createdAt_idx" ON "Charge"("clientId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
