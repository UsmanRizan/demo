import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-gray-50">
      <Header user={user} />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Sports Booking Platform
          </p>

          <h2 className="text-5xl font-bold tracking-tight text-gray-900">
            Find and book indoor sports facilities.
          </h2>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            Find available courts, turfs, and sports facilities near you and
            book the time that works for you.
          </p>

          <div className="mt-8 flex gap-4">
            <a
              href="/player/find-booking"
              className="rounded-lg bg-black px-6 py-3 font-medium text-white"
            >
              Find a Booking
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
