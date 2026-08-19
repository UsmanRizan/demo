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
        router.push("/login");
        return;
      }

      // API returned an error - fallback to client-side cookie clearing
      clearSessionCookieClientSide();
      router.push("/login");
    } catch {
      // Network error - fallback to client-side cookie clearing
      clearSessionCookieClientSide();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold">BookMyPlay</h1>

        {user ? (
          <div className="flex items-center gap-4">
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
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Sign In
          </a>
        )}
      </div>
    </header>
  );
}
