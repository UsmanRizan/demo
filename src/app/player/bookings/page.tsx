import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BookingsClient from "./BookingsClient";

export default async function PlayerBookingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "PLAYER") {
    redirect("/");
  }

  const rawBookings = await prisma.booking.findMany({
    where: { playerId: user.id },
    include: {
      facility: {
        include: {
          sports: { select: { name: true } },
          location: { select: { name: true, address: true, city: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const bookings = rawBookings.map((b) => ({
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    totalPrice: b.totalPrice.toString(),
    status: b.status,
    paymentStatus: b.paymentStatus,
    paymentMethod: b.paymentMethod,
    orderId: b.orderId,
    createdAt: b.createdAt.toISOString(),
    facility: {
      id: b.facility.id,
      name: b.facility.name,
      price: b.facility.price.toString(),
      sports: b.facility.sports,
      location: b.facility.location,
    },
  }));

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <a href="/player" className="text-sm text-gray-600">
            ← Back to Player Dashboard
          </a>

          <h1 className="mt-3 text-3xl font-bold">My Bookings</h1>

          <p className="mt-2 text-gray-600">
            View and manage your sports facility bookings.
          </p>
        </div>

        <BookingsClient initialBookings={bookings} />
      </div>
    </main>
  );
}
