"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type User = {
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  id?: string;
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

  const initials = user
    ? [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join("").toUpperCase() || user.phone.slice(-2)
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
        headers: { "Content-Type": "application/json" },
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

  const dashboardHref =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "OWNER"
        ? "/owner"
        : user?.role === "STAFF"
          ? "/staff"
          : "/player";

  const navLinks = user
    ? user.role === "PLAYER"
      ? [
          { href: "/player/find-booking", label: "Find Courts" },
          { href: "/player/bookings", label: "My Bookings" },
        ]
      : user.role === "OWNER"
        ? [
            { href: "/owner", label: "Dashboard" },
            { href: "/owner/bookings", label: "Bookings" },
            { href: "/owner/earnings", label: "Earnings" },
          ]
        : user.role === "STAFF"
          ? [
              { href: "/staff", label: "Dashboard" },
            ]
          : [
              { href: "/admin", label: "Dashboard" },
              { href: "/admin/users", label: "Users" },
              { href: "/admin/sports", label: "Sports" },
              { href: "/admin/withdrawals", label: "Withdrawals" },
            ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-black bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <a href={user ? dashboardHref : "/"} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center bg-black text-sm font-bold text-white">
            B
          </div>
          <span className="text-lg font-bold uppercase tracking-tight">BookMyPlay</span>
        </a>

        {/* Desktop nav links */}
        {user ? (
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-black hover:bg-black hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : (
          <nav className="hidden items-center gap-1 sm:flex">
            <a
              href="/help"
              className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-black hover:bg-black hover:text-white transition-colors"
            >
              Help
            </a>
            <a
              href="/contact"
              className="px-3 py-2 text-sm font-bold uppercase tracking-wide text-black hover:bg-black hover:text-white transition-colors"
            >
              Contact
            </a>
          </nav>
        )}

        {/* Desktop user actions */}
        {user ? (
          <div className="hidden items-center gap-3 sm:flex">
            <a
              href={dashboardHref}
              className="flex items-center gap-2 border-[2px] border-black px-3 py-1.5 hover:bg-black hover:text-white transition-colors"
            >
              {initials && (
                <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] font-bold text-white">
                  {initials}
                </span>
              )}
              <span className="text-sm font-bold uppercase">{displayName}</span>
            </a>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="border-[2px] border-black px-3 py-1.5 text-sm font-bold uppercase text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        ) : (
          <div className="hidden items-center gap-3 sm:flex">
            <a
              href="/login"
              className="px-4 py-2 text-sm font-bold uppercase text-black border-[2px] border-black hover:bg-black hover:text-white transition-colors"
            >
              Sign in
            </a>
            <a
              href="/login"
              className="bg-black px-4 py-2 text-sm font-bold uppercase text-white border-[2px] border-black hover:bg-white hover:text-black transition-colors"
            >
              Get Started
            </a>
          </div>
        )}

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center border-[2px] border-black text-black transition-colors hover:bg-black hover:text-white sm:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="square" strokeLinejoin="miter" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t-[3px] border-black bg-white px-4 pb-4 pt-3 sm:hidden">
          {user ? (
            <div className="flex flex-col gap-1">
              {/* User info */}
              <div className="flex items-center gap-3 border-b-[2px] border-black px-3 py-3">
                {initials && (
                  <span className="flex h-8 w-8 items-center justify-center bg-black text-xs font-bold text-white">
                    {initials}
                  </span>
                )}
                <div>
                  <p className="text-sm font-bold uppercase">{displayName}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              </div>

              {/* Nav links */}
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2.5 text-sm font-bold uppercase text-black hover:bg-black hover:text-white transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}

              <div className="my-1 border-t-[2px] border-black" />

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full px-3 py-2.5 text-left text-sm font-bold uppercase text-black border-[2px] border-red-600 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1 pt-2">
              <a
                href="/help"
                className="px-3 py-2.5 text-sm font-bold uppercase text-black hover:bg-black hover:text-white transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Help
              </a>
              <a
                href="/contact"
                className="px-3 py-2.5 text-sm font-bold uppercase text-black hover:bg-black hover:text-white transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Contact
              </a>
              <div className="my-1 border-t-[2px] border-black" />
              <a
                href="/login"
                className="block w-full bg-black px-4 py-3 text-center text-sm font-bold uppercase text-white"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
