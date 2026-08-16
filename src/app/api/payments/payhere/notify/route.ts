import { NextResponse } from "next/server";

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

    if (
      !merchantId ||
      !orderId ||
      !amount ||
      !currency ||
      !statusCode ||
      !md5sig
    ) {
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
      console.error("Invalid PayHere checksum", {
        orderId,
        paymentId,
      });

      return new NextResponse("Invalid checksum", { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: {
        orderId,
      },
    });

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const expectedAmount = Number(booking.totalPrice).toFixed(2);

    const receivedAmount = Number(amount).toFixed(2);

    if (expectedAmount !== receivedAmount || currency !== "LKR") {
      return new NextResponse("Payment mismatch", { status: 400 });
    }

    switch (statusCode) {
      case "2":
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
            paymentId,
            paymentMethod: method || null,
            expiresAt: null,
          },
        });
        break;

      case "0":
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "PENDING",
            paymentStatus: "PENDING",
            paymentId: paymentId || null,
            paymentMethod: method || null,
          },
        });
        break;

      case "-1":
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            paymentId: paymentId || null,
            paymentMethod: method || null,
            expiresAt: null,
          },
        });
        break;

      case "-2":
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "CANCELLED",
            paymentStatus: "FAILED",
            paymentId: paymentId || null,
            paymentMethod: method || null,
            expiresAt: null,
          },
        });
        break;

      case "-3":
        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: "CANCELLED",
            paymentStatus: "CHARGEBACK",
            paymentId: paymentId || null,
            paymentMethod: method || null,
            expiresAt: null,
          },
        });
        break;

      default:
        return new NextResponse("Unknown status code", { status: 400 });
    }

    return new NextResponse("OK", {
      status: 200,
    });
  } catch (error) {
    console.error("PayHere notification error:", error);

    return new NextResponse("Notification processing failed", { status: 500 });
  }
}
