import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Find answers to common questions about booking sports facilities, payments, cancellations, and managing your account on BookMyPlay.",
};

const CATEGORIES = [
  {
    title: "Getting Started",
    description: "New to BookMyPlay? Start here.",
    articles: [
      {
        q: "How do I create an account?",
        a: "Tap \"Get Started\" on the homepage, enter your phone number, and we'll send you a one-time passcode to verify. It takes less than a minute.",
      },
      {
        q: "Do I need to install an app?",
        a: "No installation required. BookMyPlay runs entirely in your browser on desktop and mobile. You can also add it to your home screen for an app-like experience.",
      },
      {
        q: "Which sports can I book?",
        a: "You can book courts, turfs, and facilities for badminton, cricket, football, and more — depending on what's available in your area.",
      },
    ],
  },
  {
    title: "Bookings & Payments",
    description: "Everything about reserving and paying for a court.",
    articles: [
      {
        q: "How do I book a facility?",
        a: "Choose a sport on the homepage, pick a date and time slot, select a venue, and confirm. You'll see the total price before you pay.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We support PayHere (cards and bank transfers) and the BookMyPlay wallet. Pay with whichever is more convenient for you.",
      },
      {
        q: "Can I cancel a booking?",
        a: "Yes. Open \"My Bookings\", select the booking, and tap cancel. Refund rules depend on how close to the slot you cancel — full details are shown before you confirm.",
      },
      {
        q: "Will I get a confirmation?",
        a: "Immediately after a successful payment you'll see a confirmation screen and receive an SMS with the booking details.",
      },
    ],
  },
  {
    title: "Facility Owners",
    description: "Run your venue on BookMyPlay.",
    articles: [
      {
        q: "How do I list my facility?",
        a: "Sign up as an owner, verify your phone number, then complete the facility and court details. Our team reviews and activates listings within 24 hours.",
      },
      {
        q: "How and when do I get paid?",
        a: "Earnings from confirmed bookings are added to your BookMyPlay wallet. You can request a withdrawal to your bank account at any time once the minimum threshold is reached.",
      },
      {
        q: "Can I block specific dates or times?",
        a: "Yes. From the owner dashboard, open a location to manage availability and add blocked dates for maintenance or private events.",
      },
      {
        q: "How do I add staff?",
        a: "In the location settings, use the Staff Manager to invite team members and assign them check-in duties at your venues.",
      },
    ],
  },
  {
    title: "Account & Security",
    description: "Manage your account and stay safe.",
    articles: [
      {
        q: "I didn't receive my OTP. What should I do?",
        a: "Wait 30 seconds and tap \"Resend\". If it still doesn't arrive, check that your phone has signal and that you're not blocking SMS from short codes.",
      },
      {
        q: "How do I change my phone number?",
        a: "Go to My Profile → Account. We'll verify the new number with an OTP before the change takes effect.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes. All card and bank payments are processed by PayHere, a PCI-DSS compliant payment gateway. BookMyPlay never stores your full card details.",
      },
    ],
  },
];

export default async function HelpCenterPage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Help Center
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              How can we help you today?
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Browse answers to the most common questions about BookMyPlay.
              Can&apos;t find what you need?{" "}
              <a href="/contact" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Contact our team
              </a>
              .
            </p>

            <div className="mt-8">
              <a
                href="#getting-started"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Browse articles
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categories grid */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.title}
                href={`#${cat.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="card-hover block rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{cat.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{cat.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ sections */}
      {CATEGORIES.map((cat, idx) => (
        <section
          key={cat.title}
          id={cat.title.toLowerCase().replace(/\s+/g, "-")}
          className={`py-16 sm:py-20 ${idx % 2 === 0 ? "bg-slate-50" : "bg-white"}`}
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{cat.title}</h2>
              <p className="mt-2 text-slate-500">{cat.description}</p>
            </div>
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {cat.articles.map((article) => (
                <details key={article.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4">
                    <h3 className="text-base font-semibold text-slate-900">{article.q}</h3>
                    <svg
                      className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{article.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Still need help?</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-300">
              Our support team is here to help with anything else. We typically respond within a few hours.
            </p>
            <div className="mt-8">
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition-colors hover:bg-slate-100"
              >
                Contact Support
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
