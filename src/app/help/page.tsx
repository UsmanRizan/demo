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
      <section className="border-b-[3px] border-black bg-black">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Help Center
            </p>
            <h1 className="mt-3 text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">
              How can we help you today?
            </h1>
            <p className="mt-4 text-lg text-gray-400">
              Browse answers to the most common questions about BookMyPlay.
              Can&apos;t find what you need?{" "}
              <a href="/contact" className="font-bold uppercase text-white hover:text-gray-300">
                Contact our team
              </a>
              .
            </p>

            <div className="mt-8">
              <a
                href="#getting-started"
                className="inline-flex items-center gap-2 border-[2px] border-white bg-white px-5 py-3 text-sm font-bold uppercase text-black transition-colors hover:bg-transparent hover:text-white"
              >
                Browse articles
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categories grid */}
      <section className="border-b-[3px] border-black bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.title}
                href={`#${cat.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="block border-[2px] border-black bg-white p-6 transition-colors hover:bg-black hover:text-white"
              >
                <div className="flex h-10 w-10 items-center justify-center border-[2px] border-black bg-black text-white transition-colors hover:bg-white hover:text-black">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-bold uppercase">{cat.title}</h3>
                <p className="mt-1 text-sm text-gray-500 group-hover:text-gray-300">{cat.description}</p>
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
          className={`py-16 sm:py-20 border-b-[3px] border-black ${idx % 2 === 0 ? "bg-black" : "bg-white"}`}
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="mb-8">
              <h2 className={`text-2xl font-bold uppercase sm:text-3xl ${idx % 2 === 0 ? "text-white" : "text-black"}`}>{cat.title}</h2>
              <p className={`mt-2 ${idx % 2 === 0 ? "text-gray-400" : "text-gray-500"}`}>{cat.description}</p>
            </div>
            <div className={`divide-y-[2px] ${idx % 2 === 0 ? "divide-white/20 border-[2px] border-white/20" : "divide-black border-[2px] border-black"}`}>
              {cat.articles.map((article) => (
                <details key={article.q} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer items-center justify-between gap-4">
                    <h3 className={`text-base font-bold uppercase ${idx % 2 === 0 ? "text-white" : "text-black"}`}>{article.q}</h3>
                    <svg
                      className={`h-5 w-5 shrink-0 transition-transform group-open:rotate-180 ${idx % 2 === 0 ? "text-gray-400" : "text-gray-400"}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <p className={`mt-3 text-sm leading-relaxed ${idx % 2 === 0 ? "text-gray-400" : "text-gray-600"}`}>{article.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-[3px] border-black bg-black px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-3xl font-bold uppercase text-white sm:text-4xl">Still need help?</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-400">
              Our support team is here to help with anything else. We typically respond within a few hours.
            </p>
            <div className="mt-8">
              <a
                href="/contact"
                className="inline-flex items-center justify-center border-[3px] border-white bg-white px-6 py-3.5 text-sm font-bold uppercase text-black transition-colors hover:bg-transparent hover:text-white"
              >
                Contact Support
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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
