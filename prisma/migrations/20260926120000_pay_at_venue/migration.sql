-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "payAtVenue" BOOLEAN NOT NULL DEFAULT false;

-- Firm bookings (online payments, holds, and pay-at-venue bookings the owner
-- has marked paid) can never overlap. Unpaid pay-at-venue reservations are
-- excluded so an online payment can take the slot over.
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_no_overlap";

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (
    "facilityId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED') AND NOT ("payAtVenue" AND "paymentStatus" = 'PENDING'));

-- Only one pay-at-venue booking per slot.
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_venue_no_overlap"
  EXCLUDE USING gist (
    "facilityId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED') AND "payAtVenue");
