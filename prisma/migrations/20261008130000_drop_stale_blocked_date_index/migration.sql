-- Corrective migration.
--
-- The previous migration used ALTER TABLE ... DROP CONSTRAINT to remove the
-- old BlockedDate_locationId_date_key, but Prisma creates @@unique as a unique
-- INDEX rather than a constraint, so there was no constraint to drop and the
-- index survived. It now blocks a second whole-venue block for the same date
-- even when different facilities are involved.

-- DropIndex
DROP INDEX IF EXISTS "BlockedDate_locationId_date_key";