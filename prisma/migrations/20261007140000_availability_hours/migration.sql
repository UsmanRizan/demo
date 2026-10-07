-- Owners pick individual opening hours, so a day can have several disjoint
-- ranges (e.g. 08:00-12:00 and 14:00-22:00) instead of one contiguous window.
--
-- `hours` is the source of truth for new writes. startTime/endTime stay in
-- sync as the envelope (earliest open, latest close) so existing queries and
-- the dynamic-pricing rules that only need the window keep working.

-- AlterTable
ALTER TABLE "Availability" ADD COLUMN "hours" JSONB;

-- Backfill existing rows from their current single opening window so today's
-- hours are unchanged by this migration.
UPDATE "Availability"
SET "hours" = jsonb_build_array(
  jsonb_build_object('start', "startTime", 'end',
    CASE WHEN "endTime" = '23:59' THEN '24:00' ELSE "endTime" END
  )
)
WHERE "hours" IS NULL;
