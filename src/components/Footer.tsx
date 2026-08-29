export default function Footer() {
  return (
    <footer className="border-t-[3px] border-black bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center bg-black text-sm font-bold text-white">
                B
              </div>
              <span className="text-lg font-bold uppercase tracking-tight">BookMyPlay</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-600">
              BookMyPlay is Sri Lanka&apos;s trusted marketplace for booking indoor and
              outdoor sports facilities — built for players, facility owners, and the
              communities that bring them together.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center border-[2px] border-black text-black transition-colors hover:bg-black hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.91h-2.33V22c4.78-.76 8.43-4.92 8.43-9.94z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center border-[2px] border-black text-black transition-colors hover:bg-black hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 1.62c-3.15 0-3.5.01-4.74.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.26.82-.38.38-.62.75-.82 1.26-.15.39-.33.97-.38 2.04C2.7 9.5 2.69 9.85 2.69 13c0 3.15.01 3.5.07 4.74.05 1.07.23 1.65.38 2.04.2.51.44.88.82 1.26.38.38.75.62 1.26.82.39.15.97.33 2.04.38 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.26-.82.38-.38.62-.75.82-1.26.15-.39.33-.97.38-2.04.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.07-.23-1.65-.38-2.04a3.4 3.4 0 00-.82-1.26 3.4 3.4 0 00-1.26-.82c-.39-.15-.97-.33-2.04-.38C15.5 3.83 15.15 3.82 12 3.82zm0 2.76a5.42 5.42 0 110 10.84 5.42 5.42 0 010-10.84zm0 1.62a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6zm5.6-1.8a1.27 1.27 0 110 2.53 1.27 1.27 0 010-2.53z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center border-[2px] border-black text-black transition-colors hover:bg-black hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.34 18.34V10.5H5.67v7.84h2.67zM7 9.16a1.55 1.55 0 100-3.1 1.55 1.55 0 000 3.1zm11.34 9.18v-4.6c0-2.36-1.26-3.46-2.95-3.46-1.36 0-1.97.75-2.31 1.28V10.5h-2.67c.04.75 0 7.84 0 7.84h2.67v-4.38c0-.24.02-.47.09-.64.18-.47.62-.96 1.35-.96.95 0 1.34.73 1.34 1.8v4.18h2.48z" />
                </svg>
              </a>
            </div>
          </div>

          {/* For Players */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide">For Players</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="/player/find-booking" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  Find a Booking
                </a>
              </li>
              <li>
                <a href="/player/bookings" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  My Bookings
                </a>
              </li>
              <li>
                <a href="/player/profile" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  My Profile
                </a>
              </li>
            </ul>
          </div>

          {/* For Owners */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide">For Facility Owners</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="/contact-owner" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  Owner Dashboard
                </a>
              </li>
              <li>
                <a href="/contact-owner" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  List Your Facility
                </a>
              </li>
              <li>
                <a href="/contact-owner" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  Manage Bookings
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide">Company & Support</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href="/login" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  Sign In
                </a>
              </li>
              <li>
                <a href="/help" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  Help Center
                </a>
              </li>
              <li>
                <a href="/contact" className="text-sm text-gray-600 hover:text-black transition-colors uppercase font-bold">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t-[2px] border-black pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs font-bold uppercase tracking-wide">
              &copy; {new Date().getFullYear()} BookMyPlay Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex gap-5">
              <a href="#" className="text-xs font-bold uppercase tracking-wide text-gray-600 hover:text-black transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-xs font-bold uppercase tracking-wide text-gray-600 hover:text-black transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-xs font-bold uppercase tracking-wide text-gray-600 hover:text-black transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
