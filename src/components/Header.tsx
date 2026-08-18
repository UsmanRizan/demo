"use client";

import { useRouter } from "next/navigation";

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

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.phone
    : null;

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    router.refresh();
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
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
            >
              Logout
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
