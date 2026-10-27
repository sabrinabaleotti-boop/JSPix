-- Inscrições Web Push (navegadores que querem aviso de Pix pago).
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "adminId" TEXT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_clientId_idx" ON "PushSubscription"("clientId");
CREATE INDEX "PushSubscription_adminId_idx" ON "PushSubscription"("adminId");

ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
