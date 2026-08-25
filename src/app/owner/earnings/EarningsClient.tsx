"use client";

import { useMemo, useState } from "react";

type Facility = {
  id: string;
  name: string;
  price: string;
  location: { id: string; name: string };
};

type Booking = {
  id: string;
  startAt: string;
  endAt: string;
  totalPrice: string;
  status: string;
  facility: Facility;
};

type WalletTransaction = {
  id: string;
  amount: string;
  type: string;
  note: string | null;
  bookingId: string | null;
  createdAt: string;
};

type EarningsClientProps = {
  bookings: Booking[];
  wallet: {
    balance: string;
    transactions: WalletTransaction[];
  } | null;
};

type Period = "all" | "thisMonth" | "lastMonth" | "thisYear";

const PERIOD_TABS: { id: Period; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "thisYear", label: "This Year" },
];

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return `Rs. ${num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCurrencyCompact(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  if (num >= 1000000) return `Rs. ${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `Rs. ${(num / 1000).toFixed(1)}K`;
  return formatCurrency(num);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeZone: "Asia/Colombo",
  }).format(date);
}

function getOwnerEarnings(booking: Booking): number {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const ownerPrice = Number(booking.facility.price);
  return hours * ownerPrice;
}

function filterByPeriod(bookings: Booking[], period: Period): Booking[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  return bookings.filter((b) => {
    const bookingDate = new Date(b.startAt);
    switch (period) {
      case "thisMonth":
        return bookingDate >= startOfMonth;
      case "lastMonth":
        return bookingDate >= startOfLastMonth && bookingDate <= endOfLastMonth;
      case "thisYear":
        return bookingDate >= startOfYear;
      default:
        return true;
    }
  });
}

export default function EarningsClient({ bookings, wallet }: EarningsClientProps) {
  const [activePeriod, setActivePeriod] = useState<Period>("all");

  const filteredBookings = useMemo(
    () => filterByPeriod(bookings, activePeriod),
    [bookings, activePeriod],
  );

  const stats = useMemo(() => {
    const totalEarnings = filteredBookings.reduce(
      (sum, b) => sum + getOwnerEarnings(b),
      0,
    );
    const totalBookings = filteredBookings.length;
    const avgPerBooking = totalBookings > 0 ? totalEarnings / totalBookings : 0;

    // Earnings by location
    const byLocation = new Map<string, { name: string; earnings: number; count: number }>();
    for (const b of filteredBookings) {
      const loc = b.facility.location;
      const existing = byLocation.get(loc.id);
      const earnings = getOwnerEarnings(b);
      if (existing) {
        existing.earnings += earnings;
        existing.count += 1;
      } else {
        byLocation.set(loc.id, { name: loc.name, earnings, count: 1 });
      }
    }
    const locationBreakdown = Array.from(byLocation.values()).sort(
      (a, b) => b.earnings - a.earnings,
    );

    // Earnings by facility
    const byFacility = new Map<string, { name: string; earnings: number; count: number }>();
    for (const b of filteredBookings) {
      const fac = b.facility;
      const existing = byFacility.get(fac.id);
      const earnings = getOwnerEarnings(b);
      if (existing) {
        existing.earnings += earnings;
        existing.count += 1;
      } else {
        byFacility.set(fac.id, { name: fac.name, earnings, count: 1 });
      }
    }
    const facilityBreakdown = Array.from(byFacility.values()).sort(
      (a, b) => b.earnings - a.earnings,
    );

    return {
      totalEarnings,
      totalBookings,
      avgPerBooking,
      locationBreakdown,
      facilityBreakdown,
    };
  }, [filteredBookings]);

  const walletBalance = wallet ? Number(wallet.balance) : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Earnings</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrencyCompact(stats.totalEarnings)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Completed Bookings</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg per Booking</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrencyCompact(stats.avgPerBooking)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Wallet Balance</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrencyCompact(walletBalance)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 border-b border-gray-200">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActivePeriod(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activePeriod === tab.id
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Earnings by Location */}
      {stats.locationBreakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Earnings by Location</h2>
          <div className="space-y-3">
            {stats.locationBreakdown.map((loc) => (
              <div key={loc.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{loc.name}</p>
                    <p className="text-sm text-slate-500">{loc.count} paid bookings</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(loc.earnings)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earnings by Facility */}
      {stats.facilityBreakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Earnings by Facility</h2>
          <div className="space-y-3">
            {stats.facilityBreakdown.map((fac) => (
              <div key={fac.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-900">{fac.name}</p>
                  <p className="text-sm text-slate-500">{fac.count} paid bookings</p>
                </div>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(fac.earnings)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {wallet && wallet.transactions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Wallet Transactions</h2>
          <div className="divide-y divide-slate-100">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {tx.type === "CREDIT" ? "Booking earning" : "Debit"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(new Date(tx.createdAt))}
                    {tx.note && ` · ${tx.note}`}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    tx.type === "CREDIT" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {tx.type === "CREDIT" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredBookings.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No earnings yet</h3>
          <p className="mt-2 text-sm text-slate-500">
            Earnings will appear here once bookings are completed and paid.
          </p>
        </div>
      )}
    </div>
  );
}
