"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Location = {
  id: string;
  name: string;
};

type Facility = {
  id: string;
  name: string;
  price: string;
  sport: { id: string; name: string };
  location: { id: string; name: string; address: string; city: string };
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

type BookingsClientProps = {
  initialBookings: Booking[];
  locations: Location[];
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
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-gray-50 text-gray-600 border-gray-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

const PAYMENT_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Payment pending", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  PAID: { label: "Paid", className: "bg-green-50 text-green-700 border-green-200" },
  FAILED: { label: "Payment failed", className: "bg-red-50 text-red-700 border-red-200" },
  CANCELLED: { label: "Payment cancelled", className: "bg-gray-50 text-gray-600 border-gray-200" },
  CHARGEBACK: { label: "Chargeback", className: "bg-red-50 text-red-700 border-red-200" },
};

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return `Rs. ${num.toLocaleString("en-LK")}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(date);
}

function getOwnerEarnings(booking: Booking): string {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const ownerPrice = Number(booking.facility.price);
  const earnings = hours * ownerPrice;
  return `Rs. ${earnings.toLocaleString("en-LK")}`;
}

function getPlayerName(player: Player): string {
  const fullName = [player.firstName, player.lastName].filter(Boolean).join(" ");
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

export default function BookingsClient({
  initialBookings,
  locations,
}: BookingsClientProps) {
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("upcoming");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionConfirmId, setActionConfirmId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  const filteredBookings = useMemo(() => {
    let result = initialBookings;

    if (activeFilter === "upcoming") {
      result = result.filter((b) => isUpcoming(b, now));
    } else if (activeFilter === "past") {
      result = result.filter((b) => isPast(b, now));
    }

    if (locationFilter !== "all") {
      result = result.filter((b) => b.facility.location.id === locationFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    return result;
  }, [activeFilter, initialBookings, locationFilter, statusFilter, now]);

  const tabCounts = useMemo(() => ({
    all: initialBookings.length,
    upcoming: initialBookings.filter((b) => isUpcoming(b, now)).length,
    past: initialBookings.filter((b) => isPast(b, now)).length,
  }), [initialBookings, now]);

  async function handleAction(bookingId: string, action: string) {
    setActionLoading(bookingId);
    setActionError("");

    try {
      const response = await fetch(`/api/owner/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || `Failed to ${action} booking.`);
        return;
      }

      router.refresh();
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
      setActionConfirmId(null);
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex gap-3">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {actionError && (
        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {filteredBookings.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">No bookings found for this filter.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredBookings.map((booking) => {
            const statusBadge = STATUS_BADGE[booking.status] || STATUS_BADGE.PENDING;
            const paymentBadge = PAYMENT_BADGE[booking.paymentStatus] || PAYMENT_BADGE.PENDING;
            const isLoading = actionLoading === booking.id;
            const showConfirm = actionConfirmId === booking.id;
            const canConfirm = booking.status === "PENDING" && booking.paymentStatus === "PAID";
            const canComplete = booking.status === "CONFIRMED" && isPast(booking, now);
            const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";

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
                      <p>{booking.facility.sport.name}</p>
                      <p>{booking.facility.location.name}</p>
                      <p className="text-gray-500">
                        {booking.facility.location.address}, {booking.facility.location.city}
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
                      <p className="text-xs text-gray-500">{booking.player.phone}</p>
                      {booking.player.email && (
                        <p className="text-xs text-gray-500">{booking.player.email}</p>
                      )}
                    </div>

                    {booking.orderId && (
                      <p className="mt-2 text-xs text-gray-400">
                        Order: {booking.orderId}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <p className="text-xs text-gray-500">
                      Rs. {Number(booking.facility.price).toLocaleString("en-LK")} / hour
                    </p>
                    <p className="text-2xl font-bold">
                      {getOwnerEarnings(booking)}
                    </p>

                    {canConfirm && !showConfirm && (
                      <button
                        type="button"
                        onClick={() => setActionConfirmId(booking.id)}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                      >
                        Confirm
                      </button>
                    )}

                    {canComplete && !showConfirm && (
                      <button
                        type="button"
                        onClick={() => setActionConfirmId(booking.id)}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                      >
                        Mark complete
                      </button>
                    )}

                    {canCancel && !showConfirm && (
                      <button
                        type="button"
                        onClick={() => setActionConfirmId(booking.id)}
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}

                    {showConfirm && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-800">
                          {actionLoading === booking.id
                            ? "Processing..."
                            : "Are you sure? This cannot be undone."}
                        </p>
                        <div className="mt-3 flex gap-2">
                          {canConfirm && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAction(booking.id, "confirm")}
                              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                              {isLoading ? "Saving..." : "Yes, confirm"}
                            </button>
                          )}
                          {canComplete && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAction(booking.id, "complete")}
                              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                              {isLoading ? "Saving..." : "Yes, complete"}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAction(booking.id, "cancel")}
                              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                              {isLoading ? "Cancelling..." : "Yes, cancel"}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => setActionConfirmId(null)}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                          >
                            Back
                          </button>
                        </div>
                      </div>
                    )}
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
