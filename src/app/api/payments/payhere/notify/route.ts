import { after, NextResponse } from "next/server";

import { confirmPaidBookings, VENUE_BUMP_REASON } from "@/lib/bookings";
import { creditWallet, netForBooking } from "@/lib/ledger";
import { logError } from "@/lib/monitoring";
import { notifyBookingCancelled, notifyBookingConfirmed } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { verifyPayHereNotification } from "@/lib/payhere";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const merchantId = String(formData.get("merchant_id") ?? "");
    const orderId = String(formData.get("order_id") ?? "");
    const paymentId = String(formData.get("payment_id") ?? "");
    const amount = String(formData.get("payhere_amount") ?? "");
    const currency = String(formData.get("payhere_currency") ?? "");
    const statusCode = String(formData.get("status_code") ?? "");
    const md5sig = String(formData.get("md5sig") ?? "");
    const method = String(formData.get("method") ?? "");

    if (!merchantId || !orderId || !amount || !currency || !statusCode || !md5sig) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    if (merchantId !== process.env.PAYHERE_MERCHANT_ID) {
      return new NextResponse("Invalid merchant", { status: 400 });
    }

    const validSignature = verifyPayHereNotification({
      orderId,
      amount,
      currency,
      statusCode,
      md5sig,
    });

    if (!validSignature) {
      logError("Invalid PayHere checksum", { orderId, paymentId });

      return new NextResponse("Invalid checksum", { status: 400 });
    }

    // A single booking uses orderId directly; a weekly series shares groupOrderId.
    const bookings = await prisma.booking.findMany({
      where: { OR: [{ orderId }, { groupOrderId: orderId }] },
      orderBy: { startAt: "asc" },
    });

    if (bookings.length === 0) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    // The player switched this hold to pay-at-venue, but the card payment
    // they had started still went through. Keep the venue booking and return
    // the card money to their wallet (once).
    if (bookings.every((b) => b.payAtVenue)) {
      if (statusCode === "2") {
        const first = bookings[0];

        await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${first.id} FOR UPDATE`;

          const already = await netForBooking(tx, first.playerId, first.id, ["BOOKING_REFUND"]);

          if (already > 0) {
            return;
          }

          await creditWallet(tx, {
            userId: first.playerId,
            amount: Number(amount),
            category: "BOOKING_REFUND",
            bookingId: first.id,
            note: "Card payment received for a pay-at-venue booking",
          });
        });

        logError("PayHere payment for pay-at-venue booking refunded to wallet", {
          orderId,
          paymentId,
          amount,
        });
      }

      return new NextResponse("OK", { status: 200 });
    }

    const expectedAmount = bookings
      .reduce((sum, b) => sum + Number(b.totalPrice), 0)
      .toFixed(2);

    const receivedAmount = Number(amount).toFixed(2);

    if (expectedAmount !== receivedAmount || currency !== "LKR") {
      logError("PayHere payment mismatch", { orderId, expectedAmount, receivedAmount, currency });

      return new NextResponse("Payment mismatch", { status: 400 });
    }

    const ids = bookings.map((b) => b.id);
    const paymentFields = {
      paymentId: paymentId || null,
      paymentMethod: method || null,
    };

    switch (statusCode) {
      case "2": {
        const { confirmed, bumpedVenue } = await confirmPaidBookings(ids, paymentFields);

        if (confirmed.length > 0) {
          after(() => notifyBookingConfirmed(confirmed));
        }

        for (const id of bumpedVenue) {
          after(() => notifyBookingCancelled(id, "system", 0, VENUE_BUMP_REASON));
        }

        break;
      }

      case "0":
        // Payment pending at PayHere; keep the hold as is.
        await prisma.booking.updateMany({
          where: { id: { in: ids }, paymentStatus: "PENDING" },
          data: paymentFields,
        });
        break;

      case "-1":
      case "-2": {
        // Cancelled / failed. Never touch bookings that are already paid.
        const now = new Date();

        await prisma.booking.updateMany({
          where: { id: { in: ids }, paymentStatus: "PENDING" },
          data: {
            status: "CANCELLED",
            paymentStatus: statusCode === "-1" ? "CANCELLED" : "FAILED",
            ...paymentFields,
            expiresAt: null,
            cancelledAt: now,
            cancellationReason:
              statusCode === "-1" ? "Payment cancelled" : "Payment failed",
          },
        });
        break;
      }

      case "-3": {
        // Chargeback: the money has been pulled back by the card issuer.
        await prisma.booking.updateMany({
          where: { id: { in: ids } },
          data: {
            status: "CANCELLED",
            paymentStatus: "CHARGEBACK",
            ...paymentFields,
            expiresAt: null,
            cancelledAt: new Date(),
            cancellationReason: "Chargeback",
          },
        });
        logError("PayHere chargeback received - review owner earnings manually", {
          orderId,
          bookingIds: ids,
        });
        break;
      }

      default:
        return new NextResponse("Unknown status code", { status: 400 });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    logError("PayHere notification error:", error);

    return new NextResponse("Notification processing failed", { status: 500 });
  }
}
