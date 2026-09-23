import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 sm:px-6">
      <div className="w-full max-w-md border-[3px] border-black bg-white p-8 text-center">
        <p className="text-5xl font-bold">404</p>
        <h1 className="mt-3 text-2xl font-bold uppercase">Page not found</h1>
        <p className="mt-3 text-sm text-gray-600">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="/player/find-booking"
            className="border-[3px] border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            Find a court
          </a>
          <Link
            href="/"
            className="border-[3px] border-black px-5 py-3 text-sm font-bold uppercase transition-colors hover:bg-black hover:text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
