import { requireOwner } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
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
            sports: { select: { id: true, name: true } },
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
      sports: b.facility.sports,
      location: b.facility.location,
    },
  }));

  return (
    <main className="min-h-screen bg-slate-50">
      <Header user={user} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">My Bookings</h1>
          <p className="mt-1 text-slate-500">
            View and manage bookings for all your facilities.
          </p>
        </div>

        <BookingsClient initialBookings={bookings} locations={locations} />
      </div>
    </main>
  );
}
