"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type User = {
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
};

type HeaderProps = {
  user: User | null;
};

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone
    : null;

  function clearSessionCookieClientSide() {
    document.cookie =
      "session=; path=/; max-age=0; SameSite=Lax; " +
      (process.env.NODE_ENV === "production" ? "Secure; " : "");
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setMobileOpen(false);
        router.push("/login");
        return;
      }

      clearSessionCookieClientSide();
      setMobileOpen(false);
      router.push("/login");
    } catch {
      clearSessionCookieClientSide();
      setMobileOpen(false);
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <h1 className="text-xl font-bold sm:text-2xl">BookMyPlay</h1>

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-lg sm:hidden"
          aria-label="Toggle menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 7h16M4 12h16M4 17h16"
              />
            )}
          </svg>
        </button>

        {/* Desktop user actions */}
        {user ? (
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-sm text-gray-600">{displayName}</span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className="hidden sm:block rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Sign In
          </a>
        )}
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200 px-4 pb-4 sm:hidden">
          {user ? (
            <div className="mt-3 flex flex-col gap-3">
              <span className="text-sm text-gray-600">{displayName}</span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium disabled:opacity-50"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <a
                href="/login"
                className="block w-full rounded-lg bg-black px-4 py-3 text-center text-sm font-medium text-white"
              >
                Sign In
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
