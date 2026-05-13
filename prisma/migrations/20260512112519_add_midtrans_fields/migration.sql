-- AlterEnum
ALTER TYPE "MetodePembayaran" ADD VALUE 'MIDTRANS';

-- AlterTable
ALTER TABLE "Donasi"
    ADD COLUMN "midtransOrderId"       TEXT,
    ADD COLUMN "midtransToken"         TEXT,
    ADD COLUMN "midtransPaymentUrl"    TEXT,
    ADD COLUMN "midtransStatus"        TEXT,
    ADD COLUMN "midtransTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Donasi_midtransOrderId_key" ON "Donasi"("midtransOrderId");
