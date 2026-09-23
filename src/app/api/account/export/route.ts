import { NextResponse } from "next/server";

import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { maskAccountNumber } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";

/** Download a copy of all personal data held about the signed-in user (PDPA). */
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimits([
    { key: `export:user:${currentUser.id}`, limit: 5, windowSeconds: 3600 },
  ]);

  if (limited) {
    return limited;
  }

  const id = currentUser.id;

  const [user, bookings, wallet, reviews, favorites, withdrawals, notifications, locations] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          address: {
            select: { addressLine1: true, addressLine2: true, city: true, country: true },
          },
        },
      }),
      prisma.booking.findMany({
        where: { playerId: id },
        orderBy: { startAt: "desc" },
        select: {
          id: true,
          orderId: true,
          startAt: true,
          endAt: true,
          totalPrice: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          createdAt: true,
          cancelledAt: true,
          cancellationReason: true,
          facility: { select: { name: true, location: { select: { name: true } } } },
        },
      }),
      prisma.wallet.findUnique({
        where: { userId: id },
        select: {
          balance: true,
          transactions: {
            orderBy: { createdAt: "desc" },
            select: {
              amount: true,
              type: true,
              category: true,
              balanceAfter: true,
              bookingId: true,
              note: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.review.findMany({
        where: { playerId: id },
        select: { bookingId: true, rating: true, comment: true, createdAt: true },
      }),
      prisma.favorite.findMany({
        where: { userId: id },
        select: { createdAt: true, location: { select: { name: true } } },
      }),
      prisma.withdrawalRequest.findMany({
        where: { ownerId: id },
        select: {
          amount: true,
          bankName: true,
          accountLast4: true,
          accountHolderName: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.notification.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { channel: true, type: true, body: true, status: true, createdAt: true },
      }),
      prisma.location.findMany({
        where: { ownerId: id },
        select: { name: true, address: true, city: true, isActive: true, createdAt: true },
      }),
    ]);

  await audit({
    actorId: id,
    action: "account.export",
    entityType: "User",
    entityId: id,
    request,
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: user,
    bookings,
    wallet,
    reviews,
    favorites,
    withdrawals: withdrawals.map(({ accountLast4, ...rest }) => ({
      ...rest,
      account: maskAccountNumber(accountLast4),
    })),
    locations,
    notifications,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookmyplay-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
