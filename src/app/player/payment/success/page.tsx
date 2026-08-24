import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
        {paid ? (
          <>
            <div className="text-5xl">✓</div>

            <h1 className="mt-5 text-3xl font-bold">Payment successful</h1>

            <p className="mt-3 text-gray-600">
              Your booking has been confirmed.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold">Payment processing</h1>

            <p className="mt-3 text-gray-600">
              We received your return from PayHere. Your payment status is still
              being confirmed.
            </p>
          </>
        )}

        <div className="mt-8 rounded-xl bg-gray-50 p-5 text-left">
          <p className="font-semibold">{booking.facility.name}</p>

          <p className="mt-1 text-sm text-gray-500">
            {booking.facility.location.name}
          </p>

          <p className="mt-4 text-sm">
            {booking.startAt.toLocaleString()}
            {" – "}
            {booking.endAt.toLocaleTimeString()}
          </p>

          <p className="mt-4 text-xl font-bold">
            Rs. {Number(booking.totalPrice).toLocaleString()}
          </p>
        </div>

        <a
          href="/player"
          className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
        >
          Go to Player Dashboard
        </a>
      </div>
    </main>
  );
}
