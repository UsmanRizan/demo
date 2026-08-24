/*
  Warnings:

  - You are about to drop the column `sportId` on the `Facility` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Facility" DROP CONSTRAINT "Facility_sportId_fkey";

-- DropIndex
DROP INDEX "Facility_sportId_idx";

-- DropIndex
DROP INDEX "WalletTransaction_bookingId_idx";

-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "sportId";

-- CreateTable
CREATE TABLE "_FacilityToSport" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FacilityToSport_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FacilityToSport_B_index" ON "_FacilityToSport"("B");

-- AddForeignKey
ALTER TABLE "_FacilityToSport" ADD CONSTRAINT "_FacilityToSport_A_fkey" FOREIGN KEY ("A") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FacilityToSport" ADD CONSTRAINT "_FacilityToSport_B_fkey" FOREIGN KEY ("B") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
