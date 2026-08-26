import { requireOwner } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EarningsClient from "./EarningsClient";

export default async function OwnerEarningsPage() {
  const user = await requireOwner();

  const [rawBookings, wallet, rawWithdrawals] = await Promise.all([
    prisma.booking.findMany({
      where: {
        facility: {
          location: {
            ownerId: user.id,
          },
        },
        paymentStatus: "PAID",
        OR: [
          { status: "COMPLETED" },
          { status: "CONFIRMED", endAt: { lt: new Date() } },
        ],
      },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            price: true,
            location: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { startAt: "desc" },
    }),
    prisma.wallet.findUnique({
      where: { userId: user.id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    }),
    prisma.withdrawalRequest.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const bookings = rawBookings.map((b) => ({
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    totalPrice: b.totalPrice.toString(),
    status: b.status,
    facility: {
      id: b.facility.id,
      name: b.facility.name,
      price: b.facility.price.toString(),
      location: b.facility.location,
    },
  }));

  const walletData = wallet
    ? {
        balance: wallet.balance.toString(),
        transactions: wallet.transactions.map((t) => ({
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
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">My Earnings</h1>
          <p className="mt-1 text-slate-500">
            Track your revenue from bookings across all your facilities.
          </p>
        </div>

        <EarningsClient bookings={bookings} wallet={walletData} withdrawals={withdrawals} />
      </div>

      <Footer />
    </main>
  );
}
