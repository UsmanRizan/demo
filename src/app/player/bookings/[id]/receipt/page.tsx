import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { PLATFORM_FEE_PERCENTAGE } from "@/lib/constants";
import { formatLkr, ownerShareFromTotal, roundMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import PrintButton from "./PrintButton";

export const metadata: Metadata = {
  title: "Receipt",
  robots: { index: false },
};

type PageProps = { params: Promise<{ id: string }> };

function colombo(date: Date, style: "date" | "datetime" | "time") {
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    ...(style === "date"
      ? { dateStyle: "long" as const }
      : style === "time"
        ? { timeStyle: "short" as const }
        : { dateStyle: "medium" as const, timeStyle: "short" as const }),
  }).format(date);
}

/** Printable receipt ("Save as PDF" from the browser print dialog). */
export default async function ReceiptPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          address: { select: { addressLine1: true, addressLine2: true, city: true, country: true } },
        },
      },
      facility: {
        select: {
          name: true,
          sports: { select: { name: true } },
          location: { select: { name: true, address: true, city: true, ownerId: true } },
        },
      },
    },
  });

  const canView =
    booking &&
    (booking.playerId === user.id ||
      booking.facility.location.ownerId === user.id ||
      user.role === "ADMIN");

  if (!booking || !canView) {
    notFound();
  }

  if (booking.paymentStatus !== "PAID" && booking.paymentStatus !== "REFUNDED") {
    notFound();
  }

  const total = Number(booking.totalPrice);
  const net = booking.ownerAmount !== null ? Number(booking.ownerAmount) : ownerShareFromTotal(total);
  const fee = roundMoney(total - net);
  const hours = (booking.endAt.getTime() - booking.startAt.getTime()) / 3_600_000;
  const player = booking.player;
  const receiptNo = booking.orderId ?? booking.id;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-2xl justify-between print:hidden">
        <a href="/player/bookings" className="text-sm font-bold uppercase text-gray-600 hover:text-black">
          ← My bookings
        </a>
        <PrintButton />
      </div>

      <article className="mx-auto max-w-2xl border-[3px] border-black bg-white p-8 print:border-0">
        <header className="flex items-start justify-between border-b-[3px] border-black pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center bg-black text-sm font-bold text-white">B</div>
              <span className="text-lg font-bold uppercase">BookMyPlay</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">BookMyPlay Pvt. Ltd. · Sri Lanka</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase">
              {booking.paymentStatus === "REFUNDED" ? "Receipt (refunded)" : "Receipt"}
            </h1>
            <p className="mt-1 text-xs text-gray-500">No. {receiptNo}</p>
            <p className="text-xs text-gray-500">Issued {colombo(booking.createdAt, "date")}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b-[2px] border-black py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Billed to</p>
            <p className="mt-1 font-bold">
              {[player.firstName, player.lastName].filter(Boolean).join(" ") || "Customer"}
            </p>
            {player.email && <p>{player.email}</p>}
            <p>+{player.phone}</p>
            {player.address && (
              <p className="text-gray-600">
                {[player.address.addressLine1, player.address.addressLine2, player.address.city, player.address.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Venue</p>
            <p className="mt-1 font-bold">{booking.facility.location.name}</p>
            <p className="text-gray-600">
              {booking.facility.location.address}, {booking.facility.location.city}
            </p>
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b-[2px] border-black text-left text-xs uppercase">
              <th className="pb-2">Description</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-3">
                <p className="font-bold">
                  {booking.facility.name} · {booking.facility.sports.map((s) => s.name).join(" / ")}
                </p>
                <p className="text-gray-600">
                  {colombo(booking.startAt, "date")}, {colombo(booking.startAt, "time")} –{" "}
                  {colombo(booking.endAt, "time")} ({hours} hr{hours === 1 ? "" : "s"})
                </p>
              </td>
              <td className="py-3 text-right align-top">{formatLkr(net)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-3">Service fee ({PLATFORM_FEE_PERCENTAGE}%)</td>
              <td className="py-3 text-right">{formatLkr(fee)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 text-right font-bold uppercase">Total paid</td>
              <td className="pt-4 text-right text-lg font-bold">{formatLkr(total)}</td>
            </tr>
            {booking.paymentStatus === "REFUNDED" && (
              <tr>
                <td className="pt-1 text-right text-sm">Refunded to wallet</td>
                <td className="pt-1 text-right text-sm">−{formatLkr(total)}</td>
              </tr>
            )}
          </tfoot>
        </table>

        <footer className="mt-8 border-t-[2px] border-black pt-4 text-xs text-gray-500">
          <p>
            Payment method: {booking.paymentMethod === "wallet" ? "BookMyPlay wallet" : booking.paymentMethod ?? "Card (PayHere)"}
            {booking.paymentId && ` · Transaction ${booking.paymentId}`}
          </p>
          <p className="mt-1">Booked {colombo(booking.createdAt, "datetime")} (Asia/Colombo)</p>
        </footer>
      </article>
    </main>
  );
}
