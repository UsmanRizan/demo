"use client";

import { useMemo, useState } from "react";

type Facility = {
  id: string;
  name: string;
  price: string;
  sports: { id: string; name: string }[];
};

type Player = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
};

type Booking = {
  id: string;
  startAt: string;
  endAt: string;
  totalPrice: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  orderId: string | null;
  createdAt: string;
  player: Player;
  facility: Facility;
};

type StaffBookingsClientProps = {
  initialBookings: Booking[];
};

type FilterTab = "all" | "upcoming" | "past";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Awaiting payment",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-50 text-slate-500 border-slate-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Payment pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  FAILED: {
    label: "Payment failed",
    className: "bg-red-50 text-red-600 border-red-200",
  },
  CANCELLED: {
    label: "Payment cancelled",
    className: "bg-slate-50 text-slate-500 border-slate-200",
  },
  CHARGEBACK: {
    label: "Chargeback",
    className: "bg-red-50 text-red-600 border-red-200",
  },
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

function getPlayerName(player: Player): string {
  const fullName = [player.firstName, player.lastName]
    .filter(Boolean)
    .join(" ");
  return fullName || "Unknown player";
}

function isUpcoming(booking: Booking, now: Date): boolean {
  return (
    (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
    new Date(booking.startAt) > now
  );
}

function isPast(booking: Booking, now: Date): boolean {
  return new Date(booking.endAt) < now;
}

export default function StaffBookingsClient({
  initialBookings,
}: StaffBookingsClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("upcoming");
  const now = useMemo(() => new Date(), []);

  const filteredBookings = useMemo(() => {
    if (activeFilter === "upcoming") {
      return initialBookings.filter((b) => isUpcoming(b, now));
    } else if (activeFilter === "past") {
      return initialBookings.filter((b) => isPast(b, now));
    }
    return initialBookings;
  }, [activeFilter, initialBookings, now]);

  const tabCounts = useMemo(
    () => ({
      all: initialBookings.length,
      upcoming: initialBookings.filter((b) => isUpcoming(b, now)).length,
      past: initialBookings.filter((b) => isPast(b, now)).length,
    }),
    [initialBookings, now],
  );

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 border-b border-gray-200">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeFilter === tab.id
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-400">
              ({tabCounts[tab.id]})
            </span>
          </button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">No bookings found for this filter.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredBookings.map((booking) => {
            const statusBadge =
              STATUS_BADGE[booking.status] || STATUS_BADGE.PENDING;
            const paymentBadge =
              PAYMENT_BADGE[booking.paymentStatus] || PAYMENT_BADGE.PENDING;

            return (
              <div
                key={booking.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {booking.facility.name}
                      </h3>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${paymentBadge.className}`}
                      >
                        {paymentBadge.label}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      <p>
                        {booking.facility.sports
                          .map((s) => s.name)
                          .join(", ")}
                      </p>
                    </div>

                    <div className="mt-3 text-sm">
                      <p className="font-medium">
                        {formatDateTime(new Date(booking.startAt))}
                      </p>
                      <p className="text-gray-500">
                        to {formatDateTime(new Date(booking.endAt))}
                      </p>
                    </div>

                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-700">
                        {getPlayerName(booking.player)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {booking.player.phone}
                      </p>
                      {booking.player.email && (
                        <p className="text-xs text-gray-500">
                          {booking.player.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <p className="text-lg font-bold">
                      Rs. {Number(booking.totalPrice).toLocaleString("en-LK")}
                    </p>
                    <p className="text-xs text-gray-500">
                      Rs. {Number(booking.facility.price).toLocaleString("en-LK")} / hour
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
