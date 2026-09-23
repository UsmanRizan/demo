import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { PLAYER_CANCEL_WINDOW_HOURS, PAYMENT_HOLD_MINUTES } from "@/lib/bookings";
import { PLATFORM_FEE_PERCENTAGE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you book or list sports facilities on BookMyPlay.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="23 September 2026"
      intro={
        <p>
          These terms govern your use of BookMyPlay, operated by BookMyPlay Pvt. Ltd. in Sri
          Lanka. By creating an account or making a booking you agree to them. If you list a
          facility, the owner terms in section 6 also apply to you.
        </p>
      }
      sections={[
        {
          heading: "Accounts",
          body: (
            <>
              <p>
                You sign in with a Sri Lankan mobile number verified by a one-time code, and may
                add a password. Keep your credentials private; you are responsible for activity
                on your account. You can sign out of all devices from your profile at any time.
              </p>
              <p>You must be at least 16, or have a parent or guardian&apos;s permission.</p>
            </>
          ),
        },
        {
          heading: "Bookings and payment",
          body: (
            <ul>
              <li>
                Prices shown include a {PLATFORM_FEE_PERCENTAGE}% service fee and any peak or
                off-peak adjustment set by the venue.
              </li>
              <li>
                A selected slot is held for {PAYMENT_HOLD_MINUTES} minutes while you pay. If
                payment isn&apos;t completed in that time the hold is released.
              </li>
              <li>
                Card payments are processed by PayHere. We never see or store your card number.
              </li>
              <li>
                A booking is confirmed once payment succeeds; you&apos;ll receive an SMS
                confirmation and can view a receipt in My Bookings.
              </li>
              <li>
                Weekly repeat bookings are paid upfront for every session in the series.
              </li>
            </ul>
          ),
        },
        {
          heading: "Cancellations and refunds",
          body: (
            <ul>
              <li>
                You can cancel a paid booking up to {PLAYER_CANCEL_WINDOW_HOURS} hours before it
                starts. The full amount is credited to your BookMyPlay wallet.
              </li>
              <li>
                Wallet credit can be used for any future booking. It is not redeemable for cash.
              </li>
              <li>
                If a venue cancels your booking or closes on your date, you receive a full wallet
                credit and an SMS notification.
              </li>
              <li>
                Cancellations within {PLAYER_CANCEL_WINDOW_HOURS} hours of the start time, and
                no-shows, are not refunded.
              </li>
            </ul>
          ),
        },
        {
          heading: "Using facilities",
          body: (
            <p>
              Venues set their own house rules (footwear, equipment, conduct). You are
              responsible for following them and for any damage you cause. BookMyPlay is a
              marketplace; the venue is responsible for the facility, its safety and its staff.
            </p>
          ),
        },
        {
          heading: "Reviews",
          body: (
            <p>
              You may review a booking after you have played. Reviews must be honest and about
              your own experience. We may hide reviews that are abusive, off-topic or contain
              personal information. Venues may reply publicly.
            </p>
          ),
        },
        {
          heading: "Facility owners",
          body: (
            <ul>
              <li>
                You must have the right to offer the listed facility and keep your opening
                hours, prices and closures accurate.
              </li>
              <li>
                Your earnings (the booking price before the service fee) are credited to your
                wallet when a booking is paid. If a paid booking is cancelled, the earning is
                reversed.
              </li>
              <li>
                Withdrawals are reviewed by an administrator and paid to the bank account you
                provide. The requested amount is held from your wallet while under review.
              </li>
              <li>
                If you cancel bookings or close your venue, affected players are refunded in full
                and notified automatically.
              </li>
            </ul>
          ),
        },
        {
          heading: "Acceptable use",
          body: (
            <p>
              Don&apos;t misuse the service: no automated scraping, fake bookings, attempts to
              bypass payment, or interference with other users. We may suspend accounts that do.
            </p>
          ),
        },
        {
          heading: "Liability",
          body: (
            <p>
              To the extent permitted by Sri Lankan law, BookMyPlay is not liable for injury,
              loss or damage arising from the use of a facility, or for indirect losses. Our
              total liability for any booking is limited to the amount you paid for it.
            </p>
          ),
        },
        {
          heading: "Changes and contact",
          body: (
            <p>
              We may update these terms; material changes will be announced in the app. Questions?{" "}
              <a href="/contact" className="font-bold underline">
                Contact us
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
