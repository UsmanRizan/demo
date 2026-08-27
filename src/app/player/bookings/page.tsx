import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookingsClient from "./BookingsClient";

export default async function PlayerBookingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "PLAYER") {
    redirect("/");
  }

  const rawBookings = await prisma.booking.findMany({
    where: { playerId: user.id },
    include: {
      facility: {
        include: {
          sports: { select: { name: true } },
          location: { select: { name: true, address: true, city: true, latitude: true, longitude: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const bookings = rawBookings.map((b) => ({
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    totalPrice: b.totalPrice.toString(),
    status: b.status,
    paymentStatus: b.paymentStatus,
    paymentMethod: b.paymentMethod,
    orderId: b.orderId,
    createdAt: b.createdAt.toISOString(),
    facility: {
      id: b.facility.id,
      name: b.facility.name,
      price: b.facility.price.toString(),
      sports: b.facility.sports,
      location: b.facility.location,
    },
  }));

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });
  const walletBalance = wallet ? Number(wallet.balance) : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">My Bookings</h1>
          <p className="mt-1 text-slate-500">
            View and manage your sports facility bookings.
          </p>
        </div>

        {/* Wallet Balance */}
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-500 to-indigo-600 p-5 text-white shadow-lg shadow-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-100">Wallet Balance</p>
              <p className="mt-0.5 text-2xl font-bold">
                Rs. {walletBalance.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        <BookingsClient initialBookings={bookings} />
      </div>

      <Footer />
    </main>
  );
}
