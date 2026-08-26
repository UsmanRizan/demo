/**
 * One-time backfill script: credits owner wallets for all existing paid bookings
 * that were never credited.
 *
 * Usage: npx tsx scripts/backfill-owner-wallets.ts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting owner wallet backfill...\n");

  // Find all paid bookings (COMPLETED or CONFIRMED with end time passed)
  const bookings = await prisma.booking.findMany({
    where: {
      paymentStatus: "PAID",
      OR: [
        { status: "COMPLETED" },
        { status: "CONFIRMED", endAt: { lt: new Date() } },
      ],
    },
    include: {
      facility: {
        select: {
          price: true,
          location: {
            select: { ownerId: true },
          },
        },
      },
    },
    orderBy: { startAt: "asc" },
  });

  console.log(`Found ${bookings.length} paid bookings to process.\n`);

  // Find all existing CREDIT transactions with "Booking earning" note
  // to avoid double-crediting
  const existingCredits = await prisma.walletTransaction.findMany({
    where: {
      type: "CREDIT",
      note: "Booking earning",
    },
    select: { bookingId: true },
  });

  const creditedBookingIds = new Set(
    existingCredits
      .filter((tx) => tx.bookingId !== null)
      .map((tx) => tx.bookingId as string),
  );

  console.log(
    `${creditedBookingIds.size} bookings already credited. Skipping those.\n`,
  );

  let totalCredited = 0;
  let skipped = 0;

  for (const booking of bookings) {
    if (creditedBookingIds.has(booking.id)) {
      skipped++;
      continue;
    }

    const start = new Date(booking.startAt);
    const end = new Date(booking.endAt);
    const hours =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const ownerPrice = Number(booking.facility.price);
    const ownerEarnings = hours * ownerPrice;
    const ownerId = booking.facility.location.ownerId;

    if (ownerEarnings <= 0 || !ownerId) {
      console.log(
        `  Skipping booking ${booking.id} — zero earnings or no owner`,
      );
      continue;
    }

    // Upsert owner wallet and create credit transaction
    const wallet = await prisma.wallet.upsert({
      where: { userId: ownerId },
      create: { userId: ownerId, balance: ownerEarnings },
      update: { balance: { increment: ownerEarnings } },
    });

    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: ownerEarnings,
        type: "CREDIT",
        bookingId: booking.id,
        note: "Booking earning",
      },
    });

    totalCredited += ownerEarnings;
    console.log(
      `  ✓ Credited Rs. ${ownerEarnings.toFixed(2)} to owner ${ownerId} for booking ${booking.id}`,
    );
  }

  console.log(`\nBackfill complete.`);
  console.log(`  Bookings processed: ${bookings.length - skipped}`);
  console.log(`  Bookings skipped (already credited): ${skipped}`);
  console.log(`  Total credited: Rs. ${totalCredited.toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
