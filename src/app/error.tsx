"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 sm:px-6">
      <div className="w-full max-w-md border-[3px] border-black bg-white p-8 text-center">
        <p className="text-sm font-bold uppercase text-gray-500">Error</p>
        <h1 className="mt-2 text-2xl font-bold uppercase">Something went wrong</h1>
        <p className="mt-3 text-sm text-gray-600">
          We couldn&apos;t load this page. Please try again. If the problem continues,
          contact support.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-gray-400">Reference: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => retry()}
            className="border-[3px] border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            Try again
          </button>
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
