export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                B
              </div>
              <span className="text-lg font-bold text-slate-900">BookMyPlay</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
              Find and book indoor sports facilities near you. Courts, turfs, and
              more — available by the hour.
            </p>
          </div>

          {/* For Players */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">For Players</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="/player/find-booking" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  Find a Booking
                </a>
              </li>
              <li>
                <a href="/player/bookings" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  My Bookings
                </a>
              </li>
              <li>
                <a href="/player/profile" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  My Profile
                </a>
              </li>
            </ul>
          </div>

          {/* For Owners */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">For Facility Owners</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="/contact-owner" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  Owner Dashboard
                </a>
              </li>
              <li>
                <a href="/contact-owner" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  List Your Facility
                </a>
              </li>
              <li>
                <a href="/contact-owner" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  Manage Bookings
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Support</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="/login" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                  Sign In
                </a>
              </li>
              <li>
                <span className="text-sm text-slate-400">Help Center</span>
              </li>
              <li>
                <span className="text-sm text-slate-400">Contact Us</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} BookMyPlay. All rights reserved.
          </p>
          <div className="flex gap-4">
            <span className="text-xs text-slate-400">Privacy Policy</span>
            <span className="text-xs text-slate-400">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
