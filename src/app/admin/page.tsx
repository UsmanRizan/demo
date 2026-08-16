import { requireAdmin } from "@/lib/admin";

export default async function AdminDashboard() {
  const user = await requireAdmin();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">BookMyPlay Admin</h1>
            <p className="text-sm text-gray-500">{user.phone}</p>
          </div>

          <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
            ADMIN
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-3xl font-bold">Dashboard</h2>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Users</p>
            <p className="mt-2 text-3xl font-bold">Manage</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Sports</p>
            <p className="mt-2 text-3xl font-bold">Manage</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Bookings</p>
            <p className="mt-2 text-3xl font-bold">View</p>
          </div>
        </div>

        <div className="mt-10 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Admin functions</h3>

          <div className="mt-6 flex flex-wrap gap-4">
            <a
              href="/admin/users"
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Manage Users
            </a>

            <a
              href="/admin/sports"
              className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium"
            >
              Manage Sports
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
