import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSportIcon } from "@/lib/sport-icons";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: "Find Nearby Courts",
    description:
      "Discover sports facilities close to you. We sort by distance so you can find the nearest option.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: "Book by the Hour",
    description:
      "Pick the exact time slot that works for you. Morning, afternoon, or night — you choose.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: "Pay Securely",
    description:
      "Pay with your wallet balance or card via PayHere. Fast, secure, and hassle-free.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
    title: "Instant Confirmation",
    description:
      "Your booking is confirmed the moment you pay. No waiting, no confusion.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Choose a sport",
    description: "Pick from badminton, cricket, football, and more.",
  },
  {
    number: "2",
    title: "Pick a time",
    description: "Select the date and time slot that works for you.",
  },
  {
    number: "3",
    title: "Book & pay",
    description: "Confirm your booking and pay securely.",
  },
];

const STATS = [
  { value: "500+", label: "Sports facilities" },
  { value: "25,000+", label: "Active players" },
  { value: "120,000+", label: "Bookings completed" },
  { value: "4.8/5", label: "Average rating" },
];

const TESTIMONIALS = [
  {
    quote:
      "Booking a badminton court used to mean five WhatsApp messages. With BookMyPlay I book in under a minute — and the venue always knows I&apos;m coming.",
    name: "Ruwan P.",
    role: "Player, Colombo",
  },
  {
    quote:
      "We added three of our courts to BookMyPlay last year. Revenue is up 40% and the dashboard makes managing staff and blocked dates effortless.",
    name: "Anjali S.",
    role: "Owner, Premier Sports Hub",
  },
  {
    quote:
      "It&apos;s the only platform where cancellations, refunds, and payouts just work. Our players trust it and so do we.",
    name: "Heshan D.",
    role: "Operations, Kandy Cricket Nets",
  },
];

const TRUST_LOGOS = [
  "PayHere",
  "Dialog",
  "Mobitel",
  "SLT",
  "Visa",
  "Mastercard",
];

export default async function HomePage() {
  const [user, sports] = await Promise.all([
    getCurrentUser(),
    prisma.sport.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-96 w-96 rounded-full bg-purple-100/50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Trusted by 25,000+ players across Sri Lanka
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              The smarter way to book
              <span className="block gradient-text">sports facilities</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
              BookMyPlay connects players with courts, turfs, and arenas across the
              country. Discover availability in real time, pay securely, and get on the
              court in minutes — not days.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#sports"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
              >
                Book a court
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
              <a
                href={user ? "/owner" : "/contact-owner"}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                List your facility
              </a>
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
            Secure payments & trusted partners
          </p>
          <div className="mt-6 grid grid-cols-3 items-center gap-x-8 gap-y-4 sm:grid-cols-6">
            {TRUST_LOGOS.map((logo) => (
              <div
                key={logo}
                className="flex h-10 items-center justify-center text-center text-sm font-bold tracking-wide text-slate-400 transition-colors hover:text-slate-600"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports */}
      <section id="sports" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Browse by sport
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                Find a court for your game
              </h2>
            </div>
            <p className="max-w-md text-slate-500">
              We partner with verified venues across the country. Choose a sport to see
              real-time availability near you.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sports.map((sport) => (
              <a
                key={sport.id}
                href={`/player/find-booking?sport=${sport.id}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl text-indigo-600 transition-colors group-hover:bg-white">
                    <span aria-hidden="true">{getSportIcon(sport.name)}</span>
                  </span>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{sport.name}</p>
                    <p className="text-xs text-slate-500">View available courts</p>
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Three steps to play
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">
              From searching to stepping on the court, the whole journey takes under a minute.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {index < STEPS.length - 1 && (
                  <div className="absolute left-1/2 top-8 hidden h-px w-full bg-slate-200 sm:block" />
                )}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-xl font-bold text-indigo-600 ring-4 ring-slate-50">
                  {step.number}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-sided value: Players & Owners */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Players */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/60 p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                For players
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Get on the court, faster</h3>
              <p className="mt-3 text-slate-600">
                No more phone calls or group chats to organize a game. Discover, book, and
                play — all from your phone.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Real-time availability across hundreds of venues",
                  "Transparent hourly pricing — no hidden fees",
                  "Wallet and card payments via PayHere",
                  "Instant booking confirmation by SMS",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="/player/find-booking"
                className="mt-8 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Start booking
                <svg className="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>

            {/* Owners */}
            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-white">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-300">
                For facility owners
              </p>
              <h3 className="mt-2 text-2xl font-bold">Fill your empty slots</h3>
              <p className="mt-3 text-slate-300">
                Reach thousands of players actively looking for a court, and run your
                venue with tools built for owners.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "List courts, turfs, and arenas in minutes",
                  "Manage bookings, staff, and blocked dates",
                  "Weekly payouts straight to your bank",
                  "Insights and analytics to grow revenue",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-200">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href={user ? "/owner" : "/contact-owner"}
                className="mt-8 inline-flex items-center text-sm font-semibold text-white hover:text-indigo-200"
              >
                List your facility
                <svg className="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Why BookMyPlay
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-3 text-slate-500">
              Built for players who want a seamless booking experience — and owners who
              want to grow their business.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="card-hover rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Trusted across Sri Lanka
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              What players and owners say
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <svg className="h-7 w-7 text-indigo-200" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 7H5a2 2 0 00-2 2v4a2 2 0 002 2h2v1a3 3 0 01-3 3v2a5 5 0 005-5V9a2 2 0 00-2-2zm10 0h-4a2 2 0 00-2 2v4a2 2 0 002 2h2v1a3 3 0 01-3 3v2a5 5 0 005-5V9a2 2 0 00-2-2z" />
                </svg>
                <blockquote
                  className="mt-4 text-sm leading-relaxed text-slate-700"
                  dangerouslySetInnerHTML={{ __html: `“${t.quote}”` }}
                />
                <figcaption className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to get on the court?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-indigo-100 sm:text-lg">
              Join thousands of players and hundreds of venues already on BookMyPlay.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/player/find-booking"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-indigo-700 shadow-lg transition-colors hover:bg-indigo-50"
              >
                Find a court
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
              <a
                href={user ? "/owner/locations/new" : "/contact-owner"}
                className="inline-flex items-center rounded-xl border border-indigo-400 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
              >
                List your facility
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
