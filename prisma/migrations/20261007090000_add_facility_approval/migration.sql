-- Admin approval gate for new facilities.
--
-- Owners can add a facility at any time, but it stays hidden from players and
-- cannot be booked until an admin approves it.

-- CreateEnum
CREATE TYPE "FacilityApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
-- DEFAULT 'PENDING' is a safety net for any insert that doesn't set the column
-- explicitly; the owner API always sets it.
ALTER TABLE "Facility"
  ADD COLUMN "approvalStatus" "FacilityApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "rejectionReason" TEXT;

-- Existing facilities are already live and taking bookings, so they are
-- grandfathered in as APPROVED rather than dropped from sale.
UPDATE "Facility" SET "approvalStatus" = 'APPROVED' WHERE "approvalStatus" = 'PENDING';

-- BackfillIndex
CREATE INDEX "Facility_approvalStatus_idx" ON "Facility"("approvalStatus");
