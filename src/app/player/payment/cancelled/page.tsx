import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="text-3xl font-bold">Payment cancelled</h1>

        <p className="mt-3 text-gray-600">
          Your PayHere payment was cancelled.
        </p>

        <a
          href="/player/find-booking"
          className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
        >
          Find another booking
        </a>
      </div>
    </main>
  );
}
