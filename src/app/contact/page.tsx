import type { Metadata } from "next";
import ContactPage from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the BookMyPlay team. We're here to help players, facility owners, and partners.",
};

export default function Page() {
  return <ContactPage />;
}
