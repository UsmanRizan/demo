import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal data BookMyPlay collects, why, and your rights under Sri Lanka's PDPA.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="23 September 2026"
      intro={
        <p>
          BookMyPlay Pvt. Ltd. is the controller of the personal data described here. We process
          it in line with the Personal Data Protection Act, No. 9 of 2022 (Sri Lanka). You can
          download or delete your data yourself from{" "}
          <a href="/player/profile" className="font-bold underline">
            your profile
          </a>
          .
        </p>
      }
      sections={[
        {
          heading: "Data we collect",
          body: (
            <ul>
              <li>Mobile number (to sign you in and send booking messages).</li>
              <li>Name, email and billing address (required by our payment provider).</li>
              <li>Bookings, payments, wallet transactions, reviews and saved venues.</li>
              <li>
                For owners: venue details, photos, and bank details for payouts (stored
                encrypted).
              </li>
              <li>
                Technical data: IP address for security (rate limiting, fraud prevention) and an
                essential session cookie.
              </li>
            </ul>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <ul>
              <li>To provide bookings, take payment and pay venue owners (contract).</li>
              <li>
                To send confirmations, reminders and cancellation notices by SMS or email
                (contract). We don&apos;t send marketing messages.
              </li>
              <li>To keep the service secure and prevent abuse (legitimate interest).</li>
              <li>To keep financial records as required by law (legal obligation).</li>
            </ul>
          ),
        },
        {
          heading: "Who we share it with",
          body: (
            <>
              <p>Only what each provider needs to do its job:</p>
              <ul>
                <li>PayHere: payment processing.</li>
                <li>Text.lk: SMS delivery.</li>
                <li>Resend: email delivery.</li>
                <li>Cloudinary: venue photo hosting.</li>
                <li>Neon: database hosting.</li>
                <li>
                  The venue you book receives your name and phone number so they can manage
                  your booking.
                </li>
              </ul>
              <p>We do not sell personal data.</p>
            </>
          ),
        },
        {
          heading: "How long we keep it",
          body: (
            <p>
              Account data is kept while your account is open. When you delete your account we
              remove your name, email, address and phone number immediately. Booking and payment
              records are kept, de-identified, for as long as tax law requires.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <ul>
              <li>Access and portability: download your data from your profile.</li>
              <li>Correction: edit your details on your profile.</li>
              <li>Erasure: delete your account from your profile.</li>
              <li>
                Objection and complaints: contact us, or the Data Protection Authority of Sri
                Lanka.
              </li>
            </ul>
          ),
        },
        {
          id: "cookies",
          heading: "Cookies",
          body: (
            <p>
              We use a single essential cookie, <code>session</code>, to keep you signed in. It
              is HTTP-only and expires after 7 days. We don&apos;t use advertising or analytics
              cookies.
            </p>
          ),
        },
        {
          heading: "Security",
          body: (
            <p>
              Data is encrypted in transit; bank account numbers are also encrypted at rest.
              Access to administrative functions is restricted and logged.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions or requests:{" "}
              <a href="/contact" className="font-bold underline">
                contact us
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
