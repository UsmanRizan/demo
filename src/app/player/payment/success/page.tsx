import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSportIcon } from "@/lib/sport-icons";
import Header from "@/components/Header";

type PageProps = {
  searchParams: Promise<{
    bookingId?: string;
  }>;
};

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  if (!params.bookingId) {
    redirect("/player");
  }

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.bookingId,
      playerId: user.id,
    },
    include: {
      facility: {
        include: {
          location: true,
          sports: true,
        },
      },
    },
  });

  if (!booking) {
    redirect("/player");
  }

  const paid = booking.paymentStatus === "PAID";

  const startStr = booking.startAt.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  });

  const endStr = booking.endAt.toLocaleTimeString("en-LK", {
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="flex items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-200/50 sm:p-10">
            {paid ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h1 className="mt-5 text-2xl font-bold text-slate-900">Payment successful</h1>
                <p className="mt-2 text-slate-500">
                  Your booking has been confirmed. You&apos;re all set!
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                  <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="mt-5 text-2xl font-bold text-slate-900">Payment processing</h1>
                <p className="mt-2 text-slate-500">
                  Your payment is being confirmed. This usually takes a few seconds.
                </p>
              </>
            )}

            {/* Booking details */}
            <div className="mt-6 rounded-xl bg-slate-50 p-5 text-left">
              <p className="font-semibold text-slate-900">{booking.facility.sports.length > 0 ? getSportIcon(booking.facility.sports[0].name) : "🏅"} {booking.facility.name}</p>
              <p className="mt-1 text-sm text-slate-500">{booking.facility.location.name}</p>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span>{startStr} – {endStr}</span>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-400">Amount paid</p>
                <p className="text-xl font-bold text-slate-900">
                  Rs. {Number(booking.totalPrice).toLocaleString("en-LK")}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/player/bookings"
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
              >
                View My Bookings
              </a>
              <a
                href="/player"
                className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
