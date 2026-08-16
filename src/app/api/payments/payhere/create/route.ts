import { NextResponse } from "next/server";
import crypto from "crypto";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generatePayHereHash,
  getMerchantId,
  PAYHERE_CHECKOUT_URL,
} from "@/lib/payhere";

const PAYMENT_HOLD_MINUTES = 10;

function createLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00+05:30`);
}

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function isValidSriLankanPhone(phone: string) {
  return /^94\d{9}$/.test(normalizePhone(phone));
}

function buildPayHerePayment({
  booking,
  customer,
  facility,
}: {
  booking: {
    id: string;
    orderId: string | null;
    totalPrice: unknown;
  };

  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;

    address: {
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      country: string;
    };
  };

  facility: {
    name: string;

    sport: {
      name: string;
    };
  };
}) {
  if (!booking.orderId) {
    throw new Error("Booking orderId is missing");
  }

  const amount = Number(booking.totalPrice);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid booking amount");
  }

  const currency = "LKR";

  const hash = generatePayHereHash({
    orderId: booking.orderId,

    amount,

    currency,
  });

  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is not configured");
  }

  const address = customer.address.addressLine2
    ? `${customer.address.addressLine1}, ${customer.address.addressLine2}`
    : customer.address.addressLine1;

  return {
    action: PAYHERE_CHECKOUT_URL,

    fields: {
      merchant_id: getMerchantId(),

      return_url: `${appUrl}/player/payment/success?bookingId=${booking.id}`,

      cancel_url: `${appUrl}/player/payment/cancelled?bookingId=${booking.id}`,

      notify_url: `${appUrl}/api/payments/payhere/notify`,

      first_name: customer.firstName,

      last_name: customer.lastName,

      email: customer.email,

      phone: normalizePhone(customer.phone),

      address,

      city: customer.address.city,

      country: customer.address.country,

      order_id: booking.orderId,

      items: `${facility.sport.name} - ${facility.name}`,

      currency,

      amount: amount.toFixed(2),

      hash,
    },
  };
}

export async function POST(request: Request) {
  try {
    /*
     * -------------------------------------------------------
     * 1. Authenticate player
     * -------------------------------------------------------
     */

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    if (currentUser.role !== "PLAYER") {
      return NextResponse.json(
        {
          error: "Only players can create bookings",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * 2. Load customer profile
     * -------------------------------------------------------
     */

    const customer = await prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },

      include: {
        address: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        },
      );
    }

    if (
      !customer.firstName ||
      !customer.lastName ||
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
        {
          status: 400,
        },
      );
    }

    const firstName = customer.firstName.trim();

    const lastName = customer.lastName.trim();

    const email = customer.email.trim().toLowerCase();

    const phone = normalizePhone(customer.phone);

    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          error: "First name and last name are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "Your profile contains an invalid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidSriLankanPhone(phone)) {
      return NextResponse.json(
        {
          error: "Your profile contains an invalid phone number.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * 3. Read booking request
     * -------------------------------------------------------
     */

    const body = await request.json();

    const facilityId = body.facilityId;

    const date = body.date;

    const startTime = body.startTime;

    const endTime = body.endTime;

    if (
      typeof facilityId !== "string" ||
      typeof date !== "string" ||
      typeof startTime !== "string" ||
      typeof endTime !== "string"
    ) {
      return NextResponse.json(
        {
          error: "facilityId, date, startTime and endTime are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidDate(date)) {
      return NextResponse.json(
        {
          error: "Invalid booking date.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * 4. Create booking date/time
     * -------------------------------------------------------
     */

    const startAt = createLocalDateTime(date, startTime);

    const endAt = createLocalDateTime(date, endTime);

    if (
      !Number.isFinite(startAt.getTime()) ||
      !Number.isFinite(endAt.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Invalid booking date or time.",
        },
        {
          status: 400,
        },
      );
    }

    if (endAt <= startAt) {
      return NextResponse.json(
        {
          error: "End time must be after start time.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * 5. Don't allow booking in the past
     * -------------------------------------------------------
     */

    if (startAt.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error: "You cannot book a time in the past.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * 6. Cancel expired pending payment holds
     * -------------------------------------------------------
     *
     * This is why expiresAt must exist in the database.
     */

    const now = new Date();

    await prisma.booking.updateMany({
      where: {
        status: "PENDING",

        paymentStatus: "PENDING",

        expiresAt: {
          not: null,

          lte: now,
        },
      },

      data: {
        status: "CANCELLED",

        paymentStatus: "CANCELLED",

        expiresAt: null,
      },
    });

    /*
     * -------------------------------------------------------
     * 7. Load facility and location availability
     * -------------------------------------------------------
     */

    const facility = await prisma.facility.findFirst({
      where: {
        id: facilityId,

        isActive: true,

        location: {
          isActive: true,
        },
      },

      include: {
        sport: true,

        location: {
          include: {
            availabilities: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!facility) {
      return NextResponse.json(
        {
          error: "Facility not found or unavailable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * 8. Check location opening hours
     * -------------------------------------------------------
     */

    const dayOfWeek = startAt.getDay();

    const availability = facility.location.availabilities.find(
      (item) => item.dayOfWeek === dayOfWeek,
    );

    if (!availability) {
      return NextResponse.json(
        {
          error: "The location is closed on the selected day.",
        },
        {
          status: 400,
        },
      );
    }

    const openingStart = createLocalDateTime(date, availability.startTime);

    const openingEnd = createLocalDateTime(date, availability.endTime);

    if (startAt < openingStart || endAt > openingEnd) {
      return NextResponse.json(
        {
          error: "The selected time is outside the location opening hours.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * 9. Calculate price
     * -------------------------------------------------------
     */

    const durationHours =
      (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return NextResponse.json(
        {
          error: "Invalid booking duration.",
        },
        {
          status: 400,
        },
      );
    }

    const pricePerHour = Number(facility.price);

    if (!Number.isFinite(pricePerHour) || pricePerHour <= 0) {
      return NextResponse.json(
        {
          error: "Facility price is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const totalPrice = durationHours * pricePerHour;

    /*
     * -------------------------------------------------------
     * 10. Reuse existing pending booking
     * -------------------------------------------------------
     *
     * Important for:
     * - React development double calls
     * - Browser refresh
     * - Back/forward navigation
     */

    const existingPending = await prisma.booking.findFirst({
      where: {
        playerId: customer.id,

        facilityId: facility.id,

        startAt,

        endAt,

        status: "PENDING",

        paymentStatus: "PENDING",

        expiresAt: {
          gt: now,
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingPending) {
      const payment = buildPayHerePayment({
        booking: existingPending,

        customer: {
          firstName,

          lastName,

          email,

          phone,

          address: {
            addressLine1: customer.address.addressLine1,

            addressLine2: customer.address.addressLine2,

            city: customer.address.city,

            country: customer.address.country,
          },
        },

        facility,
      });

      return NextResponse.json({
        success: true,

        bookingId: existingPending.id,

        orderId: existingPending.orderId,

        expiresAt: existingPending.expiresAt,

        payment,
      });
    }

    /*
     * -------------------------------------------------------
     * 11. Check conflicting bookings
     * -------------------------------------------------------
     *
     * CONFIRMED always blocks.
     *
     * PENDING only blocks while its payment hold
     * has not expired.
     */

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        facilityId: facility.id,

        startAt: {
          lt: endAt,
        },

        endAt: {
          gt: startAt,
        },

        OR: [
          {
            status: "CONFIRMED",
          },

          {
            status: "PENDING",

            paymentStatus: "PENDING",

            expiresAt: {
              gt: now,
            },
          },
        ],
      },

      select: {
        id: true,
        status: true,
        paymentStatus: true,
        expiresAt: true,
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        {
          error:
            "The selected time is no longer available. Please choose another slot.",

          code: "SLOT_UNAVAILABLE",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * -------------------------------------------------------
     * 12. Generate unique order ID
     * -------------------------------------------------------
     */

    const orderId = `BMP-${Date.now()}-${crypto
      .randomBytes(5)
      .toString("hex")
      .toUpperCase()}`;

    /*
     * -------------------------------------------------------
     * 13. Create temporary booking hold
     * -------------------------------------------------------
     */

    const expiresAt = new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        playerId: customer.id,

        facilityId: facility.id,

        startAt,

        endAt,

        totalPrice,

        status: "PENDING",

        paymentStatus: "PENDING",

        orderId,

        expiresAt,
      },
    });

    /*
     * -------------------------------------------------------
     * 14. Generate PayHere payment
     * -------------------------------------------------------
     */

    const payment = buildPayHerePayment({
      booking,

      customer: {
        firstName,

        lastName,

        email,

        phone,

        address: {
          addressLine1: customer.address.addressLine1,

          addressLine2: customer.address.addressLine2,

          city: customer.address.city,

          country: customer.address.country,
        },
      },

      facility,
    });

    /*
     * -------------------------------------------------------
     * 15. Return PayHere form data
     * -------------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      bookingId: booking.id,

      orderId: booking.orderId,

      expiresAt: booking.expiresAt,

      payment,
    });
  } catch (error) {
    console.error("PayHere payment creation error:", error);

    return NextResponse.json(
      {
        error: "Failed to create PayHere payment.",
      },
      {
        status: 500,
      },
    );
  }
}
