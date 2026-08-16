/*
  Warnings:

  - You are about to drop the column `facilityId` on the `Availability` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[locationId,dayOfWeek]` on the table `Availability` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `locationId` to the `Availability` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_facilityId_fkey";

-- DropIndex
DROP INDEX "Availability_facilityId_dayOfWeek_idx";

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "facilityId",
ADD COLUMN     "locationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Availability_locationId_idx" ON "Availability"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_locationId_dayOfWeek_key" ON "Availability"("locationId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
