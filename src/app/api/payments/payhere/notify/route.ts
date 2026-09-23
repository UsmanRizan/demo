import { after, NextResponse } from "next/server";

import { confirmPaidBookings } from "@/lib/bookings";
import { logError } from "@/lib/monitoring";
import { notifyBookingConfirmed } from "@/lib/notifications";
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
        const { confirmed } = await confirmPaidBookings(ids, paymentFields);

        if (confirmed.length > 0) {
          after(() => notifyBookingConfirmed(confirmed));
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
