import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return `"${safe.replace(/"/g, '""')}"`;
}

function colombo(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * CSV of the owner's wallet ledger (earnings, reversals, withdrawals) for
 * accounting. Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD filter on transaction date.
 */
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const createdAt: { gte?: Date; lt?: Date } = {};

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    createdAt.gte = new Date(`${from}T00:00:00+05:30`);
  }

  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    createdAt.lt = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86_400_000);
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      wallet: { userId: currentUser.id },
      ...(createdAt.gte || createdAt.lt ? { createdAt } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  const bookingIds = transactions
    .map((t) => t.bookingId)
    .filter((id): id is string => !!id);

  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    select: {
      id: true,
      orderId: true,
      startAt: true,
      endAt: true,
      totalPrice: true,
      facility: { select: { name: true, location: { select: { name: true } } } },
    },
  });

  const bookingById = new Map(bookings.map((b) => [b.id, b]));

  const header = [
    "Date",
    "Category",
    "Direction",
    "Amount (LKR)",
    "Balance After (LKR)",
    "Booking Ref",
    "Location",
    "Facility",
    "Session Start",
    "Player Paid (LKR)",
    "Note",
  ];

  const rows = transactions.map((t) => {
    const booking = t.bookingId ? bookingById.get(t.bookingId) : undefined;

    return [
      colombo(t.createdAt),
      t.category,
      t.type,
      Number(t.amount).toFixed(2),
      t.balanceAfter !== null ? Number(t.balanceAfter).toFixed(2) : "",
      booking?.orderId ?? t.bookingId ?? "",
      booking?.facility.location.name ?? "",
      booking?.facility.name ?? "",
      booking ? colombo(booking.startAt) : "",
      booking ? Number(booking.totalPrice).toFixed(2) : "",
      t.note ?? "",
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(`﻿${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookmyplay-earnings-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
