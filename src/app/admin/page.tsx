import { requireAdmin } from "@/lib/admin";
import Header from "@/components/Header";
import SetPasswordPrompt from "@/components/SetPasswordPrompt";

export default async function AdminDashboard() {
  const user = await requireAdmin();

  return (
    <main className="min-h-screen bg-gray-50">
      <Header user={user} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Dashboard</h2>

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

      <SetPasswordPrompt />
    </main>
  );
}
