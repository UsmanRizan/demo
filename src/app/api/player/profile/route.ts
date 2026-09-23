import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";
import { parseJson, profileSchema } from "@/lib/validation";
import { logError } from "@/lib/monitoring";

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
    logError("GET /api/player/profile error:", error);

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

    const parsed = await parseJson(request, profileSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { firstName, lastName, email, addressLine1, addressLine2, city, country } =
      parsed.data;

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
    logError("PUT /api/player/profile error:", error);

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
