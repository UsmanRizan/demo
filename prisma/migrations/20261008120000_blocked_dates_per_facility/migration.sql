-- Blocking becomes per facility.
--
-- Owners previously blocked a date for the whole venue. They now choose which
-- courts/turfs are unavailable, so a BlockedDate points at one facility.
-- Closing the whole venue is stored as one row per facility, which keeps a
-- plain unique constraint on (facilityId, date) rather than a partial index.

-- AlterTable: nullable first so the backfill can populate it.
ALTER TABLE "BlockedDate" ADD COLUMN "facilityId" TEXT;

-- Grandfather existing venue-wide blocks: expand each one to every facility at
-- that location. Locations with no facilities have nothing to block, so their
-- rows are dropped rather than left orphaned.
INSERT INTO "BlockedDate" ("id", "locationId", "facilityId", "date", "reason", "createdAt")
SELECT
  gen_random_uuid()::text,
  bd."locationId",
  f."id",
  bd."date",
  bd."reason",
  bd."createdAt"
FROM "BlockedDate" bd
JOIN "Facility" f ON f."locationId" = bd."locationId";

-- Remove the original location-wide rows now that they are expanded.
DELETE FROM "BlockedDate" WHERE "facilityId" IS NULL;

-- AlterTable: required from here on.
ALTER TABLE "BlockedDate"
  ALTER COLUMN "facilityId" SET NOT NULL,
  DROP CONSTRAINT IF EXISTS "BlockedDate_locationId_date_key";

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_facilityId_date_key" ON "BlockedDate"("facilityId", "date");

-- CreateIndex
CREATE INDEX "BlockedDate_facilityId_idx" ON "BlockedDate"("facilityId");

-- AddForeignKey
ALTER TABLE "BlockedDate"
  ADD CONSTRAINT "BlockedDate_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;