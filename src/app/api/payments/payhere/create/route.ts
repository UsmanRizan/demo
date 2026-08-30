import { NextResponse } from "next/server";
import crypto from "crypto";
import { eq, and, lt, gt, or, desc } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth";
import { calculatePlayerPrice } from "@/lib/constants";
import { db } from "@/lib/prisma";
import {
  bookings,
  facilities,
  locations,
  users,
  userAddresses,
  availabilities,
  pricingRules,
  facilityToSport,
  sports,
} from "@/db/schema";
import { calculateDynamicPrice } from "@/lib/pricing";
import { buildPayHerePayment } from "@/lib/payhere-helpers";
import {
  createLocalDateTime,
  isValidDate,
  isValidEmail,
  isValidSriLankanPhone,
  normalizePhone,
} from "@/lib/utils";

const PAYMENT_HOLD_MINUTES = 10;

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

    const [customer] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

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

    const [address] = await db
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.userId, currentUser.id))
      .limit(1);

    if (
      !customer.firstName ||
      !customer.lastName ||
      !customer.email ||
      !address?.addressLine1 ||
      !address.city ||
      !address.country
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
     */

    const now = new Date();

    await db
      .update(bookings)
      .set({
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        expiresAt: null,
      })
      .where(
        and(
          eq(bookings.status, "PENDING"),
          eq(bookings.paymentStatus, "PENDING"),
          lt(bookings.expiresAt, now),
        ),
      );

    /*
     * -------------------------------------------------------
     * 7. Load facility and location availability
     * -------------------------------------------------------
     */

    // Find facility with active location
    const [facilityWithLocation] = await db
      .select({
        facilityId: facilities.id,
        facilityName: facilities.name,
        facilityDescription: facilities.description,
        facilityPrice: facilities.price,
        facilityIsActive: facilities.isActive,
        locationId: locations.id,
        locationIsActive: locations.isActive,
      })
      .from(facilities)
      .innerJoin(locations, eq(facilities.locationId, locations.id))
      .where(
        and(
          eq(facilities.id, facilityId),
          eq(facilities.isActive, true),
          eq(locations.isActive, true),
        ),
      )
      .limit(1);

    if (!facilityWithLocation) {
      return NextResponse.json(
        {
          error: "Facility not found or unavailable.",
        },
        {
          status: 404,
        },
      );
    }

    // Load facility sports
    const facilitySports = await db
      .select({ id: sports.id, name: sports.name })
      .from(facilityToSport)
      .innerJoin(sports, eq(facilityToSport.b, sports.id))
      .where(eq(facilityToSport.a, facilityWithLocation.facilityId));

    // Load availability for this location
    const locationAvailabilities = await db
      .select()
      .from(availabilities)
      .where(
        and(
          eq(availabilities.locationId, facilityWithLocation.locationId),
          eq(availabilities.isActive, true),
        ),
      );

    // Load pricing rules for this location
    const locationPricingRules = await db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.locationId, facilityWithLocation.locationId),
          eq(pricingRules.isActive, true),
        ),
      );

    /*
     * -------------------------------------------------------
     * 8. Check location opening hours
     * -------------------------------------------------------
     */

    const dayOfWeek = startAt.getDay();

    const availability = locationAvailabilities.find(
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

    if (!availability.isTwentyFourHour) {
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

    // Apply dynamic pricing based on start time and day of week
    const startTimeStr = `${String(startAt.getHours()).padStart(2, "0")}:${String(startAt.getMinutes()).padStart(2, "0")}`;
    const { adjustedPrice } = calculateDynamicPrice(
      Number(facilityWithLocation.facilityPrice),
      startTimeStr,
      dayOfWeek,
      locationPricingRules.map((r) => ({
        startTime: r.startTime,
        endTime: r.endTime,
        percentage: Number(r.percentage),
        dayOfWeek: r.dayOfWeek,
        isActive: r.isActive,
      })),
    );

    const pricePerHour = calculatePlayerPrice(adjustedPrice);

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
     */

    const [existingPending] = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.playerId, customer.id),
          eq(bookings.facilityId, facilityWithLocation.facilityId),
          eq(bookings.startAt, startAt),
          eq(bookings.endAt, endAt),
          eq(bookings.status, "PENDING"),
          eq(bookings.paymentStatus, "PENDING"),
          gt(bookings.expiresAt, now),
        ),
      )
      .orderBy(desc(bookings.createdAt))
      .limit(1);

    if (existingPending) {
      const facility = {
        id: facilityWithLocation.facilityId,
        name: facilityWithLocation.facilityName,
        description: facilityWithLocation.facilityDescription,
        price: facilityWithLocation.facilityPrice,
        isActive: facilityWithLocation.facilityIsActive,
        sports: facilitySports.map((s) => ({ id: s.id, name: s.name })),
      };

      const payment = buildPayHerePayment({
        booking: existingPending,

        customer: {
          firstName,

          lastName,

          email,

          phone,

          address: {
            addressLine1: address.addressLine1,

            addressLine2: address.addressLine2,

            city: address.city,

            country: address.country,
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
     */

    const [conflictingBooking] = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        paymentStatus: bookings.paymentStatus,
        expiresAt: bookings.expiresAt,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.facilityId, facilityWithLocation.facilityId),
          lt(bookings.startAt, endAt),
          gt(bookings.endAt, startAt),
          or(
            eq(bookings.status, "CONFIRMED"),
            and(
              eq(bookings.status, "PENDING"),
              eq(bookings.paymentStatus, "PENDING"),
              gt(bookings.expiresAt, now),
            ),
          )!,
        ),
      )
      .limit(1);

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

    const [booking] = await db
      .insert(bookings)
      .values({
        playerId: customer.id,

        facilityId: facilityWithLocation.facilityId,

        startAt,

        endAt,

        totalPrice: String(totalPrice),

        status: "PENDING",

        paymentStatus: "PENDING",

        orderId,

        expiresAt,
      })
      .returning();

    /*
     * -------------------------------------------------------
     * 14. Generate PayHere payment
     * -------------------------------------------------------
     */

    const facility = {
      id: facilityWithLocation.facilityId,
      name: facilityWithLocation.facilityName,
      description: facilityWithLocation.facilityDescription,
      price: facilityWithLocation.facilityPrice,
      isActive: facilityWithLocation.facilityIsActive,
      sports: facilitySports.map((s) => ({ id: s.id, name: s.name })),
    };

    const payment = buildPayHerePayment({
      booking,

      customer: {
        firstName,

        lastName,

        email,

        phone,

        address: {
          addressLine1: address.addressLine1,

          addressLine2: address.addressLine2,

          city: address.city,

          country: address.country,
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
