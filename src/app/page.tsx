import { eq, and } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { sports } from "@/db/schema";
import { getSportIcon } from "@/lib/sport-icons";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="square" strokeLinejoin="miter" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: "Find Nearby Courts",
    description:
      "Discover sports facilities close to you. We sort by distance so you can find the nearest option.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: "Book by the Hour",
    description:
      "Pick the exact time slot that works for you. Morning, afternoon, or night — you choose.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: "Pay Securely",
    description:
      "Pay with your wallet balance or card via PayHere. Fast, secure, and hassle-free.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043A3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043a3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
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
  const [user, sportsList] = await Promise.all([
    getCurrentUser(),
    db
      .select({ id: sports.id, name: sports.name })
      .from(sports)
      .where(eq(sports.isActive, true))
      .orderBy(sports.name),
  ]);

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      {/* Hero Section */}
      <section className="border-b-[3px] border-black">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 border-[2px] border-black bg-white px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-black">
              <span className="h-2 w-2 bg-black" />
              Trusted by 25,000+ players across Sri Lanka
            </div>

            <h1 className="text-4xl font-bold uppercase tracking-tight sm:text-5xl lg:text-6xl">
              The smarter way to book
              <span className="block">sports facilities</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 sm:text-xl">
              BookMyPlay connects players with courts, turfs, and arenas across the
              country. Discover availability in real time, pay securely, and get on the
              court in minutes — not days.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#sports"
                className="inline-flex items-center justify-center border-[3px] border-black bg-black px-6 py-3.5 text-sm font-bold uppercase text-white hover:bg-white hover:text-black transition-colors"
              >
                Book a court
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
              <a
                href={user ? "/owner" : "/contact-owner"}
                className="inline-flex items-center justify-center border-[3px] border-black bg-white px-6 py-3.5 text-sm font-bold uppercase text-black hover:bg-black hover:text-white transition-colors"
              >
                List your facility
              </a>
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-6 border-t-[2px] border-black pt-8 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b-[3px] border-black bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-gray-500">
            Secure payments & trusted partners
          </p>
          <div className="mt-6 grid grid-cols-3 items-center gap-x-8 gap-y-4 sm:grid-cols-6">
            {TRUST_LOGOS.map((logo) => (
              <div
                key={logo}
                className="flex h-10 items-center justify-center text-center text-sm font-bold uppercase tracking-wide text-gray-400 transition-colors hover:text-black"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports */}
      <section id="sports" className="border-b-[3px] border-black bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-black">
                Browse by sport
              </p>
              <h2 className="mt-2 text-3xl font-bold uppercase sm:text-4xl">
                Find a court for your game
              </h2>
            </div>
            <p className="max-w-md text-gray-600">
              We partner with verified venues across the country. Choose a sport to see
              real-time availability near you.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sportsList.map((sport) => (
              <a
                key={sport.id}
                href={`/player/find-booking?sport=${sport.id}`}
                className="group flex items-center justify-between border-[2px] border-black bg-white p-5 transition-all hover:bg-black hover:text-white"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center bg-black text-2xl text-white transition-colors group-hover:bg-white group-hover:text-black">
                    <span aria-hidden="true">{getSportIcon(sport.name)}</span>
                  </span>
                  <div>
                    <p className="text-base font-bold uppercase">{sport.name}</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-300">View available courts</p>
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b-[3px] border-black bg-black py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-gray-400">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-bold uppercase text-white sm:text-4xl">
              Three steps to play
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-400">
              From searching to stepping on the court, the whole journey takes under a minute.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.number} className="relative text-center">
                {index < STEPS.length - 1 && (
                  <div className="absolute left-1/2 top-8 hidden h-[3px] w-full bg-white/20 sm:block" />
                )}
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center border-[3px] border-white bg-black text-xl font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-5 text-lg font-bold uppercase text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-sided value: Players & Owners */}
      <section className="border-b-[3px] border-black bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Players */}
            <div className="border-[3px] border-black bg-white p-8">
              <p className="text-sm font-bold uppercase tracking-wider text-black">
                For players
              </p>
              <h3 className="mt-2 text-2xl font-bold uppercase">Get on the court, faster</h3>
              <p className="mt-3 text-gray-600">
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
                  <li key={item} className="flex items-start gap-3 text-sm text-black">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="/player/find-booking"
                className="mt-8 inline-flex items-center text-sm font-bold uppercase text-black hover:text-gray-600"
              >
                Start booking
                <svg className="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>

            {/* Owners */}
            <div className="border-[3px] border-black bg-black p-8 text-white">
              <p className="text-sm font-bold uppercase tracking-wider text-gray-400">
                For facility owners
              </p>
              <h3 className="mt-2 text-2xl font-bold uppercase">Fill your empty slots</h3>
              <p className="mt-3 text-gray-400">
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
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-300">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href={user ? "/owner" : "/contact-owner"}
                className="mt-8 inline-flex items-center text-sm font-bold uppercase text-white hover:text-gray-300"
              >
                List your facility
                <svg className="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b-[3px] border-black bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-black">
              Why BookMyPlay
            </p>
            <h2 className="mt-2 text-3xl font-bold uppercase sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-3 text-gray-600">
              Built for players who want a seamless booking experience — and owners who
              want to grow their business.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="border-[2px] border-black bg-white p-6 transition-colors hover:bg-black hover:text-white"
              >
                <div className="flex h-11 w-11 items-center justify-center bg-black text-white hover:bg-white hover:text-black transition-colors">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-base font-bold uppercase">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 group-hover:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b-[3px] border-black bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Trusted across Sri Lanka
            </p>
            <h2 className="mt-2 text-3xl font-bold uppercase sm:text-4xl">
              What players and owners say
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="border-[2px] border-black bg-white p-6"
              >
                <svg className="h-7 w-7 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 7H5a2 2 0 00-2 2v4a2 2 0 002 2h2v1a3 3 0 01-3 3v2a5 5 0 005-5V9a2 2 0 00-2-2zm10 0h-4a2 2 0 00-2 2v4a2 2 0 002 2h2v1a3 3 0 01-3 3v2a5 5 0 005-5V9a2 2 0 00-2-2z" />
                </svg>
                <blockquote
                  className="mt-4 text-sm leading-relaxed text-black"
                  dangerouslySetInnerHTML={{ __html: `&ldquo;${t.quote}&rdquo;` }}
                />
                <figcaption className="mt-5 border-t-[2px] border-black pt-4">
                  <p className="text-sm font-bold uppercase">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="border-[3px] border-black bg-black px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-3xl font-bold uppercase text-white sm:text-4xl">
              Ready to get on the court?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-400 sm:text-lg">
              Join thousands of players and hundreds of venues already on BookMyPlay.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/player/find-booking"
                className="inline-flex items-center justify-center border-[3px] border-white bg-white px-6 py-3.5 text-sm font-bold uppercase text-black hover:bg-black hover:text-white transition-colors"
              >
                Find a court
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
              <a
                href={user ? "/owner/locations/new" : "/contact-owner"}
                className="inline-flex items-center border-[3px] border-white px-6 py-3.5 text-sm font-bold uppercase text-white transition-all hover:bg-white hover:text-black"
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
