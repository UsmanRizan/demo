import type { Metadata, Viewport } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: {
    default: "BookMyPlay — Sports Facility Booking",
    template: "%s | BookMyPlay",
  },
  description:
    "Find and book indoor sports facilities near you. Courts, turfs, and more — available by the hour.",
  keywords: ["sports", "booking", "courts", "facilities", "badminton", "cricket", "football"],
  openGraph: {
    title: "BookMyPlay",
    description: "Find and book sports facilities near you.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceMono.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
