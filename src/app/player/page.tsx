import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";
import SetPasswordPrompt from "@/components/SetPasswordPrompt";

export default async function PlayerPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "PLAYER") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <Header user={user} />

      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Welcome to BookMyPlay</h1>

        <p className="mt-2 text-gray-600">{user.phone}</p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Quick Actions</h2>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href="/player/find-booking"
              className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Find a Booking
            </a>

            <a
              href="/player/bookings"
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium"
            >
              My Bookings
            </a>

            <a
              href="/player/profile"
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium"
            >
              My Profile
            </a>
          </div>
        </div>
      </div>

      <SetPasswordPrompt />
    </main>
  );
}
