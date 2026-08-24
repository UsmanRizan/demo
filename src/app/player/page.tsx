import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import SetPasswordPrompt from "@/components/SetPasswordPrompt";

export default async function PlayerPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "PLAYER") {
    redirect("/");
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId: user.id },
  });

  const walletBalance = wallet ? Number(wallet.balance) : 0;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:py-12">
      <Header user={user} />

      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome to BookMyPlay</h1>

        <p className="mt-2 text-gray-600">{user.phone}</p>

        {/* Wallet Balance */}
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Wallet Balance</p>
              <p className="mt-1 text-3xl font-bold text-green-800">
                Rs. {walletBalance.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
          <p className="mt-2 text-xs text-green-600">
            Use your wallet balance when making a booking.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Quick Actions</h2>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href="/player/find-booking"
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Find a Booking
            </a>

            <a
              href="/player/bookings"
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium"
            >
              My Bookings
            </a>

            <a
              href="/player/profile"
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium"
            >
              My Profile
            </a>
          </div>
        </div>
      </div>

      <SetPasswordPrompt />
    </main>
  );
}
