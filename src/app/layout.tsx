import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookMyPlay",
  description: "Find and book sports facilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
