import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
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
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Welcome to BookMyPlay</h1>

        <p className="mt-2 text-gray-600">{user.phone}</p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            <a
              href="/player/find-booking"
              className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Find a Booking
            </a>
          </h2>
          <p className="mt-2 text-gray-600">
            Search for available sports facilities.
          </p>
          <a
            href="/player/profile"
            className="ml-3 mt-5 inline-block rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium"
          >
            My Profile
          </a>
        </div>
      </div>

      <SetPasswordPrompt />
    </main>
  );
}
