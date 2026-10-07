-- Weekly owner invoices.
--
-- Instead of owners requesting a withdrawal, their earnings for each
-- Sunday -> Saturday week are totalled into a WeeklyInvoice automatically and
-- settled by an admin. Payout details come from a payout profile on the owner.

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'VOID');

-- AlterEnum
ALTER TYPE "WalletTransactionCategory" ADD VALUE 'INVOICE_PAYMENT';

-- AlterTable: owner payout profile
ALTER TABLE "User"
  ADD COLUMN "payoutBankName" TEXT,
  ADD COLUMN "payoutAccountNumber" TEXT,
  ADD COLUMN "payoutAccountLast4" TEXT,
  ADD COLUMN "payoutAccountHolder" TEXT,
  ADD COLUMN "payoutUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WeeklyInvoice" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "bookingCount" INTEGER NOT NULL DEFAULT 0,
  "grossAmount" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "accountLast4" TEXT,
  "accountHolder" TEXT NOT NULL,
  "note" TEXT,
  "paidById" TEXT,
  "paidAt" TIMESTAMP(3),
  "paymentRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WeeklyInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyInvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WeeklyInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyInvoice_ownerId_periodStart_key" ON "WeeklyInvoice"("ownerId", "periodStart");

-- CreateIndex
CREATE INDEX "WeeklyInvoice_status_idx" ON "WeeklyInvoice"("status");

-- CreateIndex
CREATE INDEX "WeeklyInvoice_periodStart_idx" ON "WeeklyInvoice"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyInvoiceLine_invoiceId_bookingId_key" ON "WeeklyInvoiceLine"("invoiceId", "bookingId");

-- AddForeignKey
ALTER TABLE "WeeklyInvoice" ADD CONSTRAINT "WeeklyInvoice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyInvoiceLine" ADD CONSTRAINT "WeeklyInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "WeeklyInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
