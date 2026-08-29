import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

  const activeBookings = await prisma.booking.count({
    where: {
      playerId: user.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { gte: new Date() },
    },
  });

  const completedBookings = await prisma.booking.count({
    where: {
      playerId: user.id,
      OR: [
        { status: "COMPLETED" },
        { status: "CONFIRMED", endAt: { lt: new Date() } },
      ],
    },
  });

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone;

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Welcome */}
        <div className="mb-8">
          <p className="text-sm font-bold uppercase text-gray-500">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold uppercase sm:text-3xl">{displayName}</h1>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Wallet */}
          <div className="col-span-1 border-[3px] border-black bg-black p-6 text-white sm:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold uppercase text-gray-400">Wallet Balance</p>
                <p className="mt-2 text-3xl font-bold sm:text-4xl">
                  Rs. {walletBalance.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-2 text-xs text-gray-400 uppercase font-bold">
                  Use your balance when making a booking.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center border-[2px] border-white text-2xl">
                💰
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 border-[2px] border-black bg-white p-5">
              <p className="text-sm text-gray-500 uppercase font-bold">Active</p>
              <p className="mt-1 text-2xl font-bold">{activeBookings}</p>
              <p className="text-xs text-gray-400 uppercase">upcoming bookings</p>
            </div>
            <div className="flex-1 border-[2px] border-black bg-white p-5">
              <p className="text-sm text-gray-500 uppercase font-bold">Completed</p>
              <p className="mt-1 text-2xl font-bold">{completedBookings}</p>
              <p className="text-xs text-gray-400 uppercase">total games</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 border-[2px] border-black bg-white p-6">
          <h2 className="text-lg font-bold uppercase">Quick Actions</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <a
              href="/player/find-booking"
              className="group flex items-center gap-3 border-[2px] border-black p-4 transition-all hover:bg-black hover:text-white"
            >
              <div className="flex h-10 w-10 items-center justify-center border-[2px] border-black bg-black text-white transition-colors group-hover:bg-white group-hover:text-black">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold uppercase">Find a Court</p>
                <p className="text-xs text-gray-500 uppercase">Browse available facilities</p>
              </div>
            </a>

            <a
              href="/player/bookings"
              className="group flex items-center gap-3 border-[2px] border-black p-4 transition-all hover:bg-black hover:text-white"
            >
              <div className="flex h-10 w-10 items-center justify-center border-[2px] border-black bg-black text-white transition-colors group-hover:bg-white group-hover:text-black">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold uppercase">My Bookings</p>
                <p className="text-xs text-gray-500 uppercase">View upcoming & past</p>
              </div>
            </a>

            <a
              href="/player/profile"
              className="group flex items-center gap-3 border-[2px] border-black p-4 transition-all hover:bg-black hover:text-white"
            >
              <div className="flex h-10 w-10 items-center justify-center border-[2px] border-black bg-black text-white transition-colors group-hover:bg-white group-hover:text-black">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold uppercase">My Profile</p>
                <p className="text-xs text-gray-500 uppercase">Manage your details</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      <Footer />
      <SetPasswordPrompt />
    </main>
  );
}
