import { requireOwner } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import BookingsClient from "./BookingsClient";

export default async function OwnerBookingsPage() {
  const user = await requireOwner();

  const [rawBookings, locations] = await Promise.all([
    prisma.booking.findMany({
      where: {
        facility: {
          location: {
            ownerId: user.id,
          },
        },
      },
      include: {
        facility: {
          include: {
            sport: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, address: true, city: true } },
          },
        },
        player: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.location.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
    player: b.player,
    facility: {
      id: b.facility.id,
      name: b.facility.name,
      price: b.facility.price.toString(),
      sport: b.facility.sport,
      location: b.facility.location,
    },
  }));

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <a href="/owner" className="text-sm text-gray-600">
            ← Back to Owner Dashboard
          </a>

          <h1 className="mt-3 text-3xl font-bold">My Bookings</h1>

          <p className="mt-2 text-gray-600">
            View and manage bookings for all your facilities.
          </p>
        </div>

        <BookingsClient initialBookings={bookings} locations={locations} />
      </div>
    </main>
  );
}
