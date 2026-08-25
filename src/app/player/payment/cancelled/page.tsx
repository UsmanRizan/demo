import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";

type PageProps = {
  searchParams: Promise<{
    bookingId?: string;
  }>;
};

export default async function PaymentCancelledPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  if (params.bookingId) {
    await prisma.booking.updateMany({
      where: {
        id: params.bookingId,
        playerId: user.id,
        status: "PENDING",
        paymentStatus: "PENDING",
      },
      data: {
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        expiresAt: null,
      },
    });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="flex items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-200/50 sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">Payment cancelled</h1>

            <p className="mt-2 text-slate-500">
              Your payment was cancelled. No charges were made.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href="/player/find-booking"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
              >
                Find another court
              </a>
              <a
                href="/player"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
