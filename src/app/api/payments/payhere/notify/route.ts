import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { bookings, facilities, locations, wallets, walletTransactions } from "@/db/schema";
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

    const [booking] = await db
      .select({
        id: bookings.id,
        totalPrice: bookings.totalPrice,
        startAt: bookings.startAt,
        endAt: bookings.endAt,
        facilityPrice: facilities.price,
        ownerId: locations.ownerId,
      })
      .from(bookings)
      .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
      .innerJoin(locations, eq(facilities.locationId, locations.id))
      .where(eq(bookings.orderId, orderId))
      .limit(1);

    if (!booking) {
      return new NextResponse("Booking not found", { status: 404 });
    }

    const expectedAmount = Number(booking.totalPrice).toFixed(2);

    const receivedAmount = Number(amount).toFixed(2);

    if (expectedAmount !== receivedAmount || currency !== "LKR") {
      return new NextResponse("Payment mismatch", { status: 400 });
    }

    switch (statusCode) {
      case "2": {
        await db
          .update(bookings)
          .set({
            status: "CONFIRMED",
            paymentStatus: "PAID",
            paymentId,
            paymentMethod: method || null,
            expiresAt: null,
          })
          .where(eq(bookings.id, booking.id));

        // Credit owner's wallet with earnings
        try {
          const start = new Date(booking.startAt);
          const end = new Date(booking.endAt);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          const ownerPrice = Number(booking.facilityPrice);
          const ownerEarnings = hours * ownerPrice;
          const ownerId = booking.ownerId;

          if (ownerEarnings > 0 && ownerId) {
            // Upsert wallet
            const [existingWallet] = await db
              .select()
              .from(wallets)
              .where(eq(wallets.userId, ownerId))
              .limit(1);

            let wallet;
            if (existingWallet) {
              const newBalance = Number(existingWallet.balance) + ownerEarnings;
              [wallet] = await db
                .update(wallets)
                .set({ balance: String(newBalance) })
                .where(eq(wallets.id, existingWallet.id))
                .returning();
            } else {
              [wallet] = await db
                .insert(wallets)
                .values({
                  userId: ownerId,
                  balance: String(ownerEarnings),
                })
                .returning();
            }

            await db.insert(walletTransactions).values({
              walletId: wallet.id,
              amount: String(ownerEarnings),
              type: "CREDIT",
              bookingId: booking.id,
              note: "Booking earning",
            });
          }
        } catch (walletError) {
          console.error("Owner wallet credit failed (payment still recorded):", walletError);
        }

        break;
      }

      case "0":
        await db
          .update(bookings)
          .set({
            status: "PENDING",
            paymentStatus: "PENDING",
            paymentId: paymentId || null,
            paymentMethod: method || null,
          })
          .where(eq(bookings.id, booking.id));
        break;

      case "-1":
        await db
          .update(bookings)
          .set({
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
            paymentId: paymentId || null,
            paymentMethod: method || null,
            expiresAt: null,
          })
          .where(eq(bookings.id, booking.id));
        break;

      case "-2":
        await db
          .update(bookings)
          .set({
            status: "CANCELLED",
            paymentStatus: "FAILED",
            paymentId: paymentId || null,
            paymentMethod: method || null,
            expiresAt: null,
          })
          .where(eq(bookings.id, booking.id));
        break;

      case "-3":
        await db
          .update(bookings)
          .set({
            status: "CANCELLED",
            paymentStatus: "CHARGEBACK",
            paymentId: paymentId || null,
            paymentMethod: method || null,
            expiresAt: null,
          })
          .where(eq(bookings.id, booking.id));
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
