export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">BookMyPlay</h1>

          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Sign In
          </button>
        </div>
      </header>

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
            <button className="rounded-lg bg-black px-6 py-3 font-medium text-white">
              Find a Booking
            </button>

            <button className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900">
              Become an Owner
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
