import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function PaymentCancelledPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
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
