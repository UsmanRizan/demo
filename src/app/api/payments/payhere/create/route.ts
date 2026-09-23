import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { BookingError, createBookingHolds } from "@/lib/bookings";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { buildPayHerePayment } from "@/lib/payhere-helpers";
import { enforceRateLimits } from "@/lib/rate-limit";
import { isValidEmail, isValidSriLankanPhone, normalizePhone } from "@/lib/utils";
import { bookingRequestSchema, parseJson } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    /*
     * 1. Authenticate player
     */
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "PLAYER") {
      return NextResponse.json(
        { error: "Only players can create bookings" },
        { status: 403 },
      );
    }

    const limited = await enforceRateLimits([
      { key: `booking-create:user:${currentUser.id}`, limit: 30, windowSeconds: 600 },
    ]);

    if (limited) {
      return limited;
    }

    /*
     * 2. Load customer profile (PayHere requires name, email and address)
     */
    const customer = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { address: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      !customer.firstName?.trim() ||
      !customer.lastName?.trim() ||
      !customer.email ||
      !customer.address?.addressLine1 ||
      !customer.address.city ||
      !customer.address.country
    ) {
      return NextResponse.json(
        {
          error: "Please complete your profile before making a payment.",
          code: "PROFILE_INCOMPLETE",
        },
        { status: 400 },
      );
    }

    const email = customer.email.trim().toLowerCase();
    const phone = normalizePhone(customer.phone);

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Your profile contains an invalid email address." },
        { status: 400 },
      );
    }

    if (!isValidSriLankanPhone(phone)) {
      return NextResponse.json(
        { error: "Your profile contains an invalid phone number." },
        { status: 400 },
      );
    }

    /*
     * 3. Validate request and place payment holds
     */
    const parsed = await parseJson(request, bookingRequestSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { facilityId, date, startTime, endTime, repeatWeeks } = parsed.data;

    const holds = await createBookingHolds({
      playerId: customer.id,
      facilityId,
      slot: { date, startTime, endTime },
      repeatWeeks,
    });

    /*
     * 4. Build the PayHere checkout form for the whole order
     */
    const firstBooking = holds.bookings[0];

    const payment = buildPayHerePayment({
      booking: {
        id: firstBooking.id,
        orderId: holds.paymentOrderId,
        totalPrice: holds.totalPrice,
      },
      customer: {
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        email,
        phone,
        address: {
          addressLine1: customer.address.addressLine1,
          addressLine2: customer.address.addressLine2,
          city: customer.address.city,
          country: customer.address.country,
        },
      },
      facility: holds.facility,
    });

    return NextResponse.json({
      success: true,
      bookingId: firstBooking.id,
      bookingIds: holds.bookings.map((b) => b.id),
      orderId: holds.paymentOrderId,
      totalPrice: holds.totalPrice.toFixed(2),
      sessions: holds.bookings.map((b) => ({
        id: b.id,
        startAt: b.startAt.toISOString(),
        totalPrice: b.totalPrice.toFixed(2),
      })),
      expiresAt: holds.expiresAt,
      payment,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    logError("PayHere payment creation error:", error);

    return NextResponse.json(
      { error: "Failed to create PayHere payment." },
      { status: 500 },
    );
  }
}
