import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidEmail, normalizePhone } from "@/lib/utils";

export async function GET() {
  try {
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

    /*
     * Always load the address relation explicitly.
     */
    const user = await prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },

      include: {
        address: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      profile: {
        id: user.id,

        phone: user.phone,

        firstName: user.firstName ?? "",

        lastName: user.lastName ?? "",

        email: user.email ?? "",

        hasPassword: !!user.passwordHash,

        address: user.address
          ? {
              id: user.address.id,

              addressLine1: user.address.addressLine1 ?? "",

              addressLine2: user.address.addressLine2 ?? "",

              city: user.address.city ?? "",

              country: user.address.country ?? "Sri Lanka",
            }
          : {
              id: null,

              addressLine1: "",

              addressLine2: "",

              city: "",

              country: "Sri Lanka",
            },
      },
    });
  } catch (error) {
    console.error("GET /api/player/profile error:", error);

    return NextResponse.json(
      {
        error: "Failed to load profile",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(request: Request) {
  try {
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

    const body = await request.json();

    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";

    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const addressLine1 =
      typeof body.addressLine1 === "string" ? body.addressLine1.trim() : "";

    const addressLine2 =
      typeof body.addressLine2 === "string" ? body.addressLine2.trim() : "";

    const city = typeof body.city === "string" ? body.city.trim() : "";

    const country =
      typeof body.country === "string" ? body.country.trim() : "Sri Lanka";

    /*
     * Validate required fields.
     */
    if (
      !firstName ||
      !lastName ||
      !email ||
      !addressLine1 ||
      !city ||
      !country
    ) {
      return NextResponse.json(
        {
          error:
            "First name, last name, email, address, city and country are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Keep phone unchanged because it comes
     * from OTP authentication.
     */
    const phone = normalizePhone(currentUser.phone);

    /*
     * Update user + address in one transaction.
     */
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: {
          id: currentUser.id,
        },

        data: {
          firstName,
          lastName,
          email,
          phone,
        },
      });

      await tx.userAddress.upsert({
        where: {
          userId: currentUser.id,
        },

        create: {
          userId: currentUser.id,

          addressLine1,

          addressLine2: addressLine2 || null,

          city,

          country,
        },

        update: {
          addressLine1,

          addressLine2: addressLine2 || null,

          city,

          country,
        },
      });

      return user;
    });

    /*
     * Load the final saved record again.
     *
     * This guarantees the response contains exactly
     * what is stored in PostgreSQL.
     */
    const savedUser = await prisma.user.findUnique({
      where: {
        id: updatedUser.id,
      },

      include: {
        address: true,
      },
    });

    if (!savedUser) {
      return NextResponse.json(
        {
          error: "Profile was saved but could not be reloaded.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,

      profile: {
        id: savedUser.id,

        phone: savedUser.phone,

        firstName: savedUser.firstName ?? "",

        lastName: savedUser.lastName ?? "",

        email: savedUser.email ?? "",

        address: savedUser.address
          ? {
              id: savedUser.address.id,

              addressLine1: savedUser.address.addressLine1,

              addressLine2: savedUser.address.addressLine2 ?? "",

              city: savedUser.address.city,

              country: savedUser.address.country,
            }
          : {
              id: null,

              addressLine1: "",

              addressLine2: "",

              city: "",

              country: "Sri Lanka",
            },
      },
    });
  } catch (error) {
    console.error("PUT /api/player/profile error:", error);

    return NextResponse.json(
      {
        error: "Failed to save profile",
      },
      {
        status: 500,
      },
    );
  }
}
