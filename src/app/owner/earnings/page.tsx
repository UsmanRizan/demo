import { eq, and, or, lt, desc } from "drizzle-orm";

import { requireOwner } from "@/lib/owner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EarningsClient from "./EarningsClient";
import { db } from "@/lib/prisma";
import {
  bookings,
  facilities,
  locations,
  wallets,
  walletTransactions,
  withdrawalRequests,
} from "@/db/schema";

export default async function OwnerEarningsPage() {
  const user = await requireOwner();

  const now = new Date();

  // Get paid bookings (COMPLETED or past CONFIRMED)
  const rawBookings = await db
    .select({
      id: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      totalPrice: bookings.totalPrice,
      status: bookings.status,
      facilityId: facilities.id,
      facilityName: facilities.name,
      facilityPrice: facilities.price,
      locationId: locations.id,
      locationName: locations.name,
    })
    .from(bookings)
    .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
    .innerJoin(locations, eq(facilities.locationId, locations.id))
    .where(
      and(
        eq(locations.ownerId, user.id),
        eq(bookings.paymentStatus, "PAID"),
        or(
          eq(bookings.status, "COMPLETED"),
          and(eq(bookings.status, "CONFIRMED"), lt(bookings.endAt, now)),
        )!,
      ),
    )
    .orderBy(bookings.startAt);

  // Get wallet with recent transactions
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, user.id))
    .limit(1);

  let walletTransactionsList: Array<{
    id: string;
    amount: string;
    type: "CREDIT" | "DEBIT";
    note: string | null;
    bookingId: string | null;
    createdAt: Date;
  }> = [];

  if (wallet) {
    walletTransactionsList = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(20);
  }

  // Get withdrawal requests
  const rawWithdrawals = await db
    .select()
    .from(withdrawalRequests)
    .where(eq(withdrawalRequests.ownerId, user.id))
    .orderBy(desc(withdrawalRequests.createdAt));

  const enrichedBookings = rawBookings.map((b) => ({
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    totalPrice: b.totalPrice.toString(),
    status: b.status,
    facility: {
      id: b.facilityId,
      name: b.facilityName,
      price: b.facilityPrice.toString(),
      location: {
        id: b.locationId,
        name: b.locationName,
      },
    },
  }));

  const walletData = wallet
    ? {
        balance: wallet.balance.toString(),
        transactions: walletTransactionsList.map((t) => ({
          id: t.id,
          amount: t.amount.toString(),
          type: t.type,
          note: t.note,
          bookingId: t.bookingId,
          createdAt: t.createdAt.toISOString(),
        })),
      }
    : null;

  const withdrawals = rawWithdrawals.map((w) => ({
    id: w.id,
    amount: w.amount.toString(),
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountHolderName: w.accountHolderName,
    status: w.status,
    adminNote: w.adminNote,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            My Earnings
          </h1>
          <p className="mt-1 text-slate-500">
            Track your revenue from bookings across all your facilities.
          </p>
        </div>

        <EarningsClient
          bookings={enrichedBookings}
          wallet={walletData}
          withdrawals={withdrawals}
        />
      </div>

      <Footer />
    </main>
  );
}
