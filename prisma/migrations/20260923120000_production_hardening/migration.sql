-- CreateEnum
CREATE TYPE "WalletTransactionCategory" AS ENUM ('BOOKING_PAYMENT', 'BOOKING_REFUND', 'BOOKING_EARNING', 'EARNING_REVERSAL', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "groupOrderId" TEXT,
ADD COLUMN     "ownerAmount" DECIMAL(10,2),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "balanceAfter" DECIMAL(10,2),
ADD COLUMN     "category" "WalletTransactionCategory" NOT NULL DEFAULT 'ADJUSTMENT',
ADD COLUMN     "withdrawalRequestId" TEXT;

-- AlterTable
ALTER TABLE "WithdrawalRequest" ADD COLUMN     "accountLast4" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processedById" TEXT,
ADD COLUMN     "walletDebited" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FacilityImage" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationImage" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ownerReply" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","locationId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "FacilityImage_facilityId_idx" ON "FacilityImage"("facilityId");

-- CreateIndex
CREATE INDEX "LocationImage_locationId_idx" ON "LocationImage"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_locationId_idx" ON "Review"("locationId");

-- CreateIndex
CREATE INDEX "Review_facilityId_idx" ON "Review"("facilityId");

-- CreateIndex
CREATE INDEX "Review_playerId_idx" ON "Review"("playerId");

-- CreateIndex
CREATE INDEX "Favorite_locationId_idx" ON "Favorite"("locationId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_bookingId_type_idx" ON "Notification"("bookingId", "type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

-- CreateIndex
CREATE INDEX "Booking_groupOrderId_idx" ON "Booking"("groupOrderId");

-- CreateIndex
CREATE INDEX "WalletTransaction_bookingId_idx" ON "WalletTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "WalletTransaction_withdrawalRequestId_idx" ON "WalletTransaction"("withdrawalRequestId");

-- AddForeignKey
ALTER TABLE "FacilityImage" ADD CONSTRAINT "FacilityImage_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationImage" ADD CONSTRAINT "LocationImage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: categorise existing wallet transactions from their free-text notes
UPDATE "WalletTransaction" SET "category" = 'BOOKING_EARNING' WHERE "note" = 'Booking earning';
UPDATE "WalletTransaction" SET "category" = 'BOOKING_PAYMENT' WHERE "note" = 'Booking payment';
UPDATE "WalletTransaction" SET "category" = 'BOOKING_REFUND' WHERE "note" LIKE 'Booking cancellation refund%';
UPDATE "WalletTransaction" SET "category" = 'WITHDRAWAL' WHERE "note" LIKE 'Withdrawal%';

-- Backfill: owner share of existing bookings (total minus the 10% platform fee)
UPDATE "Booking" SET "ownerAmount" = ROUND("totalPrice" / 1.10, 2) WHERE "ownerAmount" IS NULL;

-- Backfill: last 4 digits for masked display (encryption of old rows: scripts/encrypt-bank-accounts.ts)
UPDATE "WithdrawalRequest" SET "accountLast4" = RIGHT("accountNumber", 4) WHERE "accountLast4" IS NULL;

-- Ratings are 1-5 stars
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

-- Database-level double-booking protection: two active bookings for the same
-- facility can never overlap in time. Expired PENDING holds are swept to
-- CANCELLED before a new booking is inserted.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "facilityId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));
