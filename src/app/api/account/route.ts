import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { logError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { deleteAccountSchema, parseJson } from "@/lib/validation";

class DeletionBlocked extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

/**
 * Self-service account deletion (PDPA right to erasure). Personal data is
 * anonymised; bookings and ledger entries are kept, de-identified, because
 * financial records must be retained.
 */
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJson(request, deleteAccountSchema);

    if (parsed.response) {
      return parsed.response;
    }

    if (currentUser.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin accounts must be removed by another admin." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const now = new Date();

      const upcoming = await tx.booking.count({
        where: {
          playerId: currentUser.id,
          status: { in: ["PENDING", "CONFIRMED"] },
          endAt: { gt: now },
        },
      });

      if (upcoming > 0) {
        throw new DeletionBlocked(
          "Please cancel your upcoming bookings before deleting your account.",
          "HAS_UPCOMING_BOOKINGS",
        );
      }

      if (currentUser.role === "OWNER") {
        const activeLocations = await tx.location.count({
          where: { ownerId: currentUser.id, isActive: true },
        });

        if (activeLocations > 0) {
          throw new DeletionBlocked(
            "Please deactivate your locations before deleting your account.",
            "HAS_ACTIVE_LOCATIONS",
          );
        }

        const pendingWithdrawals = await tx.withdrawalRequest.count({
          where: { ownerId: currentUser.id, status: "PENDING" },
        });

        if (pendingWithdrawals > 0) {
          throw new DeletionBlocked(
            "Please wait for your pending withdrawal to be processed.",
            "HAS_PENDING_WITHDRAWAL",
          );
        }
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId: currentUser.id },
        select: { balance: true },
      });
      const balance = wallet ? Number(wallet.balance) : 0;

      if (balance < 0) {
        throw new DeletionBlocked(
          "Your wallet has an outstanding negative balance. Please contact support.",
          "NEGATIVE_BALANCE",
        );
      }

      if (balance > 0 && currentUser.role === "OWNER") {
        throw new DeletionBlocked(
          `Please withdraw your remaining balance of Rs. ${balance.toFixed(2)} first.`,
          "HAS_BALANCE",
        );
      }

      if (balance > 0 && !parsed.data.forfeitWalletBalance) {
        throw new DeletionBlocked(
          `You have Rs. ${balance.toFixed(2)} of booking credit that will be lost. Confirm to forfeit it.`,
          "HAS_BALANCE",
        );
      }

      await tx.userAddress.deleteMany({ where: { userId: currentUser.id } });
      await tx.favorite.deleteMany({ where: { userId: currentUser.id } });
      await tx.locationStaff.deleteMany({ where: { staffId: currentUser.id } });
      await tx.otpCode.deleteMany({ where: { phone: currentUser.phone } });

      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          phone: `deleted:${currentUser.id}`,
          firstName: null,
          lastName: null,
          email: null,
          passwordHash: null,
          deletedAt: now,
          sessionVersion: { increment: 1 },
        },
      });

      await audit(
        {
          actorId: currentUser.id,
          action: "account.delete",
          entityType: "User",
          entityId: currentUser.id,
          metadata: { forfeitedBalance: balance },
          request,
        },
        tx,
      );
    });

    const response = NextResponse.json({ success: true });

    clearSessionCookie(response);

    return response;
  } catch (error) {
    if (error instanceof DeletionBlocked) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }

    logError("Account deletion error:", error);

    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
