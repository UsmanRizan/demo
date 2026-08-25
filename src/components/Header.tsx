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
          ]
        : [
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/users", label: "Users" },
            { href: "/admin/sports", label: "Sports" },
          ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <a href={user ? dashboardHref : "/"} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            B
          </div>
          <span className="text-lg font-bold text-slate-900">BookMyPlay</span>
        </a>

        {/* Desktop nav links */}
        {user && (
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        {/* Desktop user actions */}
        {user ? (
          <div className="hidden items-center gap-3 sm:flex">
            <a
              href={dashboardHref}
              className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 transition-colors hover:bg-slate-100"
            >
              {initials && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                  {initials}
                </span>
              )}
              <span className="text-sm font-medium text-slate-700">{displayName}</span>
            </a>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        ) : (
          <div className="hidden items-center gap-3 sm:flex">
            <a
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Sign in
            </a>
            <a
              href="/login"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Get Started
            </a>
          </div>
        )}

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 sm:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 sm:hidden">
          {user ? (
            <div className="flex flex-col gap-1">
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-3">
                {initials && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {initials}
                  </span>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
              </div>

              <div className="my-1 h-px bg-slate-100" />

              {/* Nav links */}
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}

              <div className="my-1 h-px bg-slate-100" />

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <a
                href="/login"
                className="block w-full rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white"
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
