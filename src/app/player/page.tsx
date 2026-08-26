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
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Welcome */}
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{displayName}</h1>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Wallet */}
          <div className="col-span-1 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 text-white shadow-lg shadow-indigo-200 sm:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-100">Wallet Balance</p>
                <p className="mt-2 text-3xl font-bold sm:text-4xl">
                  Rs. {walletBalance.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-2 text-xs text-indigo-200">
                  Use your balance when making a booking.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl">
                💰
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Active</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{activeBookings}</p>
              <p className="text-xs text-slate-400">upcoming bookings</p>
            </div>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Completed</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{completedBookings}</p>
              <p className="text-xs text-slate-400">total games</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <a
              href="/player/find-booking"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Find a Court</p>
                <p className="text-xs text-slate-500">Browse available facilities</p>
              </div>
            </a>

            <a
              href="/player/bookings"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">My Bookings</p>
                <p className="text-xs text-slate-500">View upcoming & past</p>
              </div>
            </a>

            <a
              href="/player/profile"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">My Profile</p>
                <p className="text-xs text-slate-500">Manage your details</p>
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
