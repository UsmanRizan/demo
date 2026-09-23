import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decryptSecret, isEncrypted } from "@/lib/crypto";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

import {
  Client,
  colomboDate,
  hour,
  ledger,
  payhereNotification,
  usedPhones,
  walletBalance,
} from "./helpers";

/*
 * End-to-end coverage for the production-readiness work. Everything here is
 * created with unique test phone numbers / names and deleted in afterAll.
 */

const suffix = Date.now().toString(36);

const admin = new Client();
const owner = new Client();
const playerA = new Client();
const playerB = new Client();

const ids = {
  users: [] as string[],
  sportId: "",
  locationId: "",
  facilityId: "",
  facility2Id: "",
};

type BookingResponse = {
  bookingId: string;
  bookingIds: string[];
  orderId: string;
  totalPrice: string;
  payment: { fields: Record<string, string> };
  code?: string;
  error?: string;
};

async function userId(client: Client) {
  const user = await prisma.user.findUniqueOrThrow({ where: { phone: client.phone } });
  return user.id;
}

async function book(
  client: Client,
  date: string,
  start: number,
  end = start + 1,
  extra: Record<string, unknown> = {},
  facilityId = ids.facilityId,
) {
  return client.post<BookingResponse>("/api/payments/payhere/create", {
    facilityId,
    date,
    startTime: hour(start),
    endTime: hour(end),
    ...extra,
  });
}

async function payViaPayHere(orderId: string, amount: string) {
  const notifier = new Client();
  return notifier.request(
    "POST",
    "/api/payments/payhere/notify",
    payhereNotification({ orderId, amount, statusCode: "2" }),
  );
}

async function completeProfile(client: Client, name: string) {
  const response = await client.put("/api/player/profile", {
    firstName: name,
    lastName: "Tester",
    email: `${name.toLowerCase()}.${suffix}@example.com`,
    addressLine1: "1 Test Road",
    city: "Colombo",
    country: "Sri Lanka",
  });
  expect(response.status).toBe(200);
}

beforeAll(async () => {
  const health = await new Client().get("/api/health");
  if (health.status !== 200) {
    throw new Error(`Server not reachable at E2E_BASE_URL (health: ${health.status})`);
  }

  for (const [client, role] of [
    [admin, "ADMIN"],
    [owner, "OWNER"],
    [playerA, "PLAYER"],
    [playerB, "PLAYER"],
  ] as const) {
    const user = await prisma.user.create({
      data: { phone: client.phone, role, firstName: role === "PLAYER" ? null : role },
    });
    ids.users.push(user.id);
    await client.signIn();
  }

  const ownerId = await userId(owner);

  const sport = await prisma.sport.create({
    data: { name: `E2E Sport ${suffix}`, slug: `e2e-sport-${suffix}` },
  });
  ids.sportId = sport.id;

  const location = await prisma.location.create({
    data: {
      ownerId,
      name: `E2E Arena ${suffix}`,
      address: "1 Test Road",
      city: "Colombo",
      latitude: 6.9,
      longitude: 79.86,
      availabilities: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          startTime: "00:00",
          endTime: "24:00",
          isTwentyFourHour: true,
        })),
      },
    },
  });
  ids.locationId = location.id;

  const [facility, facility2] = await Promise.all(
    ["Court A", "Court B"].map((name) =>
      prisma.facility.create({
        data: {
          locationId: location.id,
          name,
          price: 1000,
          sports: { connect: { id: sport.id } },
        },
      }),
    ),
  );
  ids.facilityId = facility.id;
  ids.facility2Id = facility2.id;

  await completeProfile(playerA, "Alice");
  await completeProfile(playerB, "Bob");
});

afterAll(async () => {
  const facilityIds = [ids.facilityId, ids.facility2Id].filter(Boolean);
  const userIds = (
    await prisma.user.findMany({
      where: { OR: [{ id: { in: ids.users } }, { phone: { startsWith: "deleted:" }, id: { in: ids.users } }] },
      select: { id: true },
    })
  ).map((u) => u.id);
  const allUserIds = [...new Set([...ids.users, ...userIds])];

  await prisma.review.deleteMany({ where: { OR: [{ facilityId: { in: facilityIds } }, { playerId: { in: allUserIds } }] } });
  await prisma.booking.deleteMany({ where: { OR: [{ facilityId: { in: facilityIds } }, { playerId: { in: allUserIds } }] } });
  await prisma.withdrawalRequest.deleteMany({ where: { ownerId: { in: allUserIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: allUserIds } } });
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorId: { in: allUserIds } },
        { entityId: { in: [...allUserIds, ids.locationId, ...facilityIds] } },
      ],
    },
  });
  if (facilityIds.length) await prisma.facility.deleteMany({ where: { id: { in: facilityIds } } });
  if (ids.locationId) await prisma.location.deleteMany({ where: { id: ids.locationId } });
  if (ids.sportId) await prisma.sport.deleteMany({ where: { id: ids.sportId } });
  await prisma.user.deleteMany({ where: { id: { in: allUserIds } } });
  await prisma.otpCode.deleteMany({ where: { phone: { in: [...usedPhones] } } });
  await prisma.rateLimit.deleteMany({
    where: { OR: [...usedPhones].map((phone) => ({ key: { contains: phone } })) },
  });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------

describe("#20 health check", () => {
  it("reports the database as reachable", async () => {
    const response = await new Client().get("/api/health");
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ status: "ok", database: "ok" });
  });
});

describe("#21 input validation", () => {
  it("rejects malformed JSON and invalid fields with 400", async () => {
    const client = new Client();
    const bad = await client.request("POST", "/api/auth/send-otp", undefined, {
      "content-type": "application/json",
    });
    expect(bad.status).toBe(400);

    const invalid = await client.post("/api/auth/send-otp", { phone: "123" });
    expect(invalid.status).toBe(400);
    expect(invalid.data).toMatchObject({ field: "phone" });
  });

  it("validates booking requests", async () => {
    const response = await book(playerA, "2030-02-30", 10);
    expect(response.status).toBe(400);
  });
});

describe("#5 rate limiting", () => {
  it("allows one OTP per minute per phone", async () => {
    const client = new Client();
    const first = await client.post("/api/auth/send-otp", { phone: client.phone });
    const second = await client.post("/api/auth/send-otp", { phone: client.phone });

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBeTruthy();
  });

  it("locks password login for a number after 10 failures", async () => {
    const victim = new Client();
    await prisma.user.create({
      data: { phone: victim.phone, passwordHash: await hashPassword("correct-horse-1") },
    });
    ids.users.push(await userId(victim));

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      // Different IPs: the per-number limit must still apply.
      const attacker = new Client(victim.phone);
      statuses.push((await attacker.post("/api/auth/login", { phone: victim.phone, password: `wrong-${i}` })).status);
    }

    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("limits the contact form per IP", async () => {
    const client = new Client();
    const message = { name: "Test", email: "t@example.com", message: "Hello there" };
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await client.post("/api/contact", message)).status);

    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });

  it("caps OTP verification attempts", async () => {
    const client = new Client();
    await prisma.otpCode.create({
      data: { phone: client.phone, codeHash: "x".repeat(64), expiresAt: new Date(Date.now() + 60_000) },
    });

    const statuses = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await client.post("/api/auth/verify-otp", { phone: client.phone, code: "000000" })).status);
    }

    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});

describe("#6 sessions and password hash exposure", () => {
  it("never sends the password hash to the browser", async () => {
    await playerA.post("/api/auth/set-password", { password: "player-a-pass-1" });

    const page = await playerA.get("/player/bookings");
    expect(page.status).toBe(200);
    expect(page.text).not.toMatch(/\$2[aby]\$/);
    expect(page.text).not.toContain("passwordHash");

    const session = await playerA.get("/api/auth/session");
    expect(session.data).toMatchObject({ authenticated: true, user: { hasPassword: true } });
  });

  it("change-password signs out other devices but keeps this one", async () => {
    const otherDevice = new Client(playerA.phone);
    const login = await otherDevice.post("/api/auth/login", {
      phone: playerA.phone,
      password: "player-a-pass-1",
    });
    expect(login.status).toBe(200);

    const change = await playerA.post("/api/auth/change-password", {
      currentPassword: "player-a-pass-1",
      newPassword: "player-a-pass-2",
    });
    expect(change.status).toBe(200);

    expect((await playerA.get("/api/auth/session")).data).toMatchObject({ authenticated: true });
    expect((await otherDevice.get("/api/auth/session")).data).toMatchObject({ authenticated: false });
  });

  it("logout-all revokes every session", async () => {
    const client = new Client();
    await prisma.user.create({ data: { phone: client.phone } });
    ids.users.push(await userId(client));
    await client.signIn();
    const stolenCookie = client.cookie;

    expect((await client.post("/api/auth/logout-all")).status).toBe(200);

    const attacker = new Client(client.phone);
    attacker.cookie = stolenCookie;
    expect((await attacker.get("/api/auth/session")).data).toMatchObject({ authenticated: false });
  });
});

describe("#22 double booking protection", () => {
  const date = colomboDate(30);

  it("reuses a player's own hold and blocks other players", async () => {
    const first = await book(playerA, date, 8);
    expect(first.status).toBe(200);

    const again = await book(playerA, date, 8);
    expect(again.data.bookingId).toBe(first.data.bookingId);

    const other = await book(playerB, date, 8);
    expect(other.status).toBe(409);
    expect(other.data.code).toBe("SLOT_UNAVAILABLE");

    await playerA.post("/api/bookings/cancel", { bookingId: first.data.bookingId });
  });

  it("is enforced by the database even if application checks are bypassed", async () => {
    const playerId = await userId(playerA);
    const startAt = new Date(`${date}T09:00:00+05:30`);
    const endAt = new Date(`${date}T10:00:00+05:30`);
    const base = { playerId, facilityId: ids.facilityId, totalPrice: 1100, status: "CONFIRMED" as const };

    await prisma.booking.create({ data: { ...base, startAt, endAt } });

    await expect(
      prisma.booking.create({
        data: { ...base, startAt: new Date(startAt.getTime() + 30 * 60_000), endAt: new Date(endAt.getTime() + 30 * 60_000) },
      }),
    ).rejects.toThrow();

    // A cancelled booking does not block the slot.
    await prisma.booking.updateMany({ where: { facilityId: ids.facilityId, startAt }, data: { status: "CANCELLED" } });
    await expect(prisma.booking.create({ data: { ...base, startAt, endAt } })).resolves.toBeTruthy();
    await prisma.booking.updateMany({ where: { facilityId: ids.facilityId, startAt }, data: { status: "CANCELLED" } });
  });
});

describe("#1 #2 #4 #9 payments, refunds and ledger", () => {
  const date = colomboDate(31);
  let bookingId = "";
  let orderId = "";
  let total = "";

  it("rejects a forged PayHere notification", async () => {
    const hold = await book(playerA, date, 10);
    expect(hold.status).toBe(200);
    bookingId = hold.data.bookingId;
    orderId = hold.data.orderId;
    total = hold.data.totalPrice;
    expect(total).toBe("1100.00");

    const forged = await new Client().request(
      "POST",
      "/api/payments/payhere/notify",
      payhereNotification({ orderId, amount: total, statusCode: "2", forge: true }),
    );
    expect(forged.status).toBe(400);
  });

  it("confirms payment, stores the owner share and credits the owner exactly once", async () => {
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(Number(booking.ownerAmount)).toBe(1000);

    expect((await payViaPayHere(orderId, total)).status).toBe(200);
    // PayHere retries notifications; a replay must not double-credit.
    expect((await payViaPayHere(orderId, total)).status).toBe(200);

    const paid = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(paid).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });

    const ownerId = await userId(owner);
    const earnings = await ledger(ownerId, bookingId);
    expect(earnings).toHaveLength(1);
    expect(earnings[0]).toMatchObject({ category: "BOOKING_EARNING", type: "CREDIT" });
    expect(Number(earnings[0].amount)).toBe(1000);
    expect(Number(earnings[0].balanceAfter)).toBe(await walletBalance(ownerId));
  });

  it("records a confirmation notification (dry run)", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const notes = await prisma.notification.findMany({ where: { bookingId, type: "BOOKING_CONFIRMED" } });
    expect(notes.length).toBeGreaterThan(0);
  });

  it("player cancellation refunds the player and reverses the owner's earning atomically", async () => {
    const ownerId = await userId(owner);
    const playerId = await userId(playerA);
    const ownerBefore = await walletBalance(ownerId);
    const playerBefore = await walletBalance(playerId);

    // Two cancels racing: exactly one may succeed.
    const results = await Promise.all([
      playerA.post("/api/bookings/cancel", { bookingId }),
      playerA.post("/api/bookings/cancel", { bookingId }),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);

    const cancelled = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(cancelled).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });

    expect(await walletBalance(playerId)).toBe(playerBefore + 1100);
    expect(await walletBalance(ownerId)).toBe(ownerBefore - 1000);

    const playerTx = await ledger(playerId, bookingId);
    expect(playerTx.filter((t) => t.category === "BOOKING_REFUND")).toHaveLength(1);
    const ownerTx = await ledger(ownerId, bookingId);
    expect(ownerTx.map((t) => t.category)).toEqual(["BOOKING_EARNING", "EARNING_REVERSAL"]);
  });

  it("pays from the wallet without allowing a double charge", async () => {
    const playerId = await userId(playerA);
    const before = await walletBalance(playerId);
    const hold = await book(playerA, date, 12);
    expect(hold.status).toBe(200);

    const results = await Promise.all([
      playerA.post("/api/payments/wallet/create", { bookingId: hold.data.bookingId }),
      playerA.post("/api/payments/wallet/create", { bookingId: hold.data.bookingId }),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await walletBalance(playerId)).toBe(before - 1100);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: hold.data.bookingId } });
    expect(booking).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID", paymentMethod: "wallet" });

    const tx = await ledger(playerId, hold.data.bookingId);
    expect(tx.map((t) => t.category)).toContain("BOOKING_PAYMENT");
  });

  it("refuses wallet payment with insufficient balance", async () => {
    const hold = await book(playerB, date, 14);
    const response = await playerB.post("/api/payments/wallet/create", { bookingId: hold.data.bookingId });
    expect(response.status).toBe(400);
    expect(String(response.data.error)).toMatch(/Insufficient/);
    await playerB.post("/api/bookings/cancel", { bookingId: hold.data.bookingId });
  });

  it("enforces the 8-hour cancellation window for paid bookings", async () => {
    const playerId = await userId(playerB);
    const soon = await prisma.booking.create({
      data: {
        playerId,
        facilityId: ids.facility2Id,
        startAt: new Date(Date.now() + 2 * 3_600_000),
        endAt: new Date(Date.now() + 3 * 3_600_000),
        totalPrice: 1100,
        ownerAmount: 1000,
        status: "CONFIRMED",
        paymentStatus: "PAID",
      },
    });

    const response = await playerB.post("/api/bookings/cancel", { bookingId: soon.id });
    expect(response.status).toBe(400);
    await prisma.booking.update({ where: { id: soon.id }, data: { status: "CANCELLED" } });
  });

  it("owner cancellation refunds the player and reverses the earning", async () => {
    const ownerId = await userId(owner);
    const playerId = await userId(playerB);
    const hold = await book(playerB, date, 16);
    await payViaPayHere(hold.data.orderId, hold.data.totalPrice);

    const ownerBefore = await walletBalance(ownerId);
    const playerBefore = await walletBalance(playerId);

    const response = await owner.patch(`/api/owner/bookings/${hold.data.bookingId}`, {
      action: "cancel",
      reason: "Court maintenance",
    });
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ walletCredited: true, refundAmount: "1100.00" });
    expect(await walletBalance(playerId)).toBe(playerBefore + 1100);
    expect(await walletBalance(ownerId)).toBe(ownerBefore - 1000);

    const audit = await prisma.auditLog.findFirst({ where: { action: "booking.cancel", entityId: hold.data.bookingId } });
    expect(audit).toBeTruthy();
  });

  it("owners cannot confirm unpaid holds", async () => {
    const hold = await book(playerB, date, 18);
    const response = await owner.patch(`/api/owner/bookings/${hold.data.bookingId}`, { action: "confirm" });
    expect(response.status).toBe(400);
    await playerB.post("/api/bookings/cancel", { bookingId: hold.data.bookingId });
  });

  it("revives a hold whose payment arrived after it expired", async () => {
    const hold = await book(playerB, date, 20);
    await prisma.booking.update({
      where: { id: hold.data.bookingId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const cron = await new Client().request("GET", "/api/cron", undefined, {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    });
    expect(cron.status).toBe(200);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: hold.data.bookingId } })).status,
    ).toBe("CANCELLED");

    await payViaPayHere(hold.data.orderId, hold.data.totalPrice);
    const revived = await prisma.booking.findUniqueOrThrow({ where: { id: hold.data.bookingId } });
    expect(revived).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
  });
});

describe("#16 weekly repeat bookings", () => {
  const date = colomboDate(35);

  it("books and pays for a weekly series in one order", async () => {
    const response = await book(playerB, date, 7, 8, { repeatWeeks: 3 });
    expect(response.status).toBe(200);
    expect(response.data.bookingIds).toHaveLength(3);
    expect(response.data.totalPrice).toBe("3300.00");
    expect(response.data.payment.fields.amount).toBe("3300.00");

    const bookings = await prisma.booking.findMany({
      where: { id: { in: response.data.bookingIds } },
      orderBy: { startAt: "asc" },
    });
    expect(new Set(bookings.map((b) => b.groupOrderId))).toEqual(new Set([response.data.orderId]));
    expect(bookings[1].startAt.getTime() - bookings[0].startAt.getTime()).toBe(7 * 86_400_000);

    await payViaPayHere(response.data.orderId, "3300.00");
    const paid = await prisma.booking.findMany({ where: { groupOrderId: response.data.orderId } });
    expect(paid.every((b) => b.status === "CONFIRMED" && b.paymentStatus === "PAID")).toBe(true);
  });

  it("releases every unpaid session when the series checkout is cancelled", async () => {
    const response = await book(playerB, date, 9, 10, { repeatWeeks: 2 });
    const cancel = await playerB.post("/api/bookings/cancel", { bookingId: response.data.bookingId });
    expect(cancel.status).toBe(200);
    expect(cancel.data.cancelledIds).toHaveLength(2);
  });

  it("rejects the series if any week is taken", async () => {
    const blocker = await book(playerA, colomboDate(35 + 7), 11);
    expect(blocker.status).toBe(200);

    const response = await book(playerB, date, 11, 12, { repeatWeeks: 2 });
    expect(response.status).toBe(409);

    await playerA.post("/api/bookings/cancel", { bookingId: blocker.data.bookingId });
  });
});

describe("#15 venue closures", () => {
  const date = colomboDate(40);

  it("blocking a date with bookings asks first, then cancels, refunds and blocks", async () => {
    const hold = await book(playerA, date, 10);
    await payViaPayHere(hold.data.orderId, hold.data.totalPrice);
    const playerId = await userId(playerA);
    const before = await walletBalance(playerId);

    const ask = await owner.post(`/api/owner/locations/${ids.locationId}/blocked-dates`, { date, reason: "Holiday" });
    expect(ask.status).toBe(409);
    expect(ask.data).toMatchObject({ code: "HAS_BOOKINGS", bookingCount: 1, paidCount: 1 });

    const confirm = await owner.post(`/api/owner/locations/${ids.locationId}/blocked-dates`, {
      date,
      reason: "Holiday",
      cancelExistingBookings: true,
    });
    expect(confirm.status).toBe(200);
    expect(confirm.data.cancelledBookings).toBe(1);
    expect(await walletBalance(playerId)).toBe(before + 1100);

    const onBlocked = await book(playerB, date, 15);
    expect(onBlocked.status).toBe(409);
    expect(onBlocked.data.code).toBe("DATE_BLOCKED");
  });

  it("deactivating a court with bookings requires confirmation", async () => {
    const hold = await book(playerB, colomboDate(41), 10, 11, {}, ids.facility2Id);
    await payViaPayHere(hold.data.orderId, hold.data.totalPrice);

    const ask = await owner.patch(`/api/owner/facilities/${ids.facility2Id}`, { isActive: false });
    expect(ask.status).toBe(409);

    const confirm = await owner.patch(`/api/owner/facilities/${ids.facility2Id}`, {
      isActive: false,
      cancelExistingBookings: true,
    });
    expect(confirm.status).toBe(200);
    expect(confirm.data.cancelledBookings).toBe(1);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: hold.data.bookingId } });
    expect(booking).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });

    await owner.patch(`/api/owner/facilities/${ids.facility2Id}`, { isActive: true });
  });
});

describe("#3 #7 #8 withdrawals", () => {
  let requestId = "";

  it("holds the amount immediately and stores the account number encrypted", async () => {
    const ownerId = await userId(owner);
    // Give the owner a known positive balance through a paid booking.
    const hold = await book(playerB, colomboDate(45), 10, 13);
    await payViaPayHere(hold.data.orderId, hold.data.totalPrice);
    const before = await walletBalance(ownerId);
    expect(before).toBeGreaterThanOrEqual(3000);

    const response = await owner.post("/api/owner/wallet/withdraw", {
      amount: 500,
      bankName: "Commercial Bank",
      accountNumber: "8001234567",
      accountHolderName: "Owner Tester",
    });
    expect(response.status).toBe(200);
    requestId = String(response.data.requestId);
    expect(await walletBalance(ownerId)).toBe(before - 500);

    const stored = await prisma.withdrawalRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(isEncrypted(stored.accountNumber)).toBe(true);
    expect(stored.accountNumber).not.toContain("8001234567");
    expect(decryptSecret(stored.accountNumber)).toBe("8001234567");
    expect(stored.accountLast4).toBe("4567");

    const list = await owner.get<{ requests: { accountNumber: string }[] }>("/api/owner/wallet/withdrawals");
    expect(list.data.requests[0].accountNumber).toBe("•••• 4567");
  });

  it("allows only one pending request, even when submitted concurrently", async () => {
    const body = { amount: 100, bankName: "BOC", accountNumber: "1111222233", accountHolderName: "O" };
    const results = await Promise.all([
      owner.post("/api/owner/wallet/withdraw", body),
      owner.post("/api/owner/wallet/withdraw", body),
    ]);
    expect(results.every((r) => r.status === 400)).toBe(true);
  });

  it("rejection returns the held amount and is audit-logged", async () => {
    const ownerId = await userId(owner);
    const before = await walletBalance(ownerId);

    const response = await admin.patch(`/api/admin/withdrawals/${requestId}`, {
      action: "reject",
      adminNote: "Wrong branch",
    });
    expect(response.status).toBe(200);
    expect(await walletBalance(ownerId)).toBe(before + 500);

    const audit = await prisma.auditLog.findFirst({ where: { action: "withdrawal.reject", entityId: requestId } });
    expect(audit?.actorId).toBe(await userId(admin));
  });

  it("admin can reveal (audited) and approve without a second debit", async () => {
    const ownerId = await userId(owner);
    const create = await owner.post("/api/owner/wallet/withdraw", {
      amount: 300,
      bankName: "HNB",
      accountNumber: "9990001112",
      accountHolderName: "Owner Tester",
    });
    const id = String(create.data.requestId);
    const afterHold = await walletBalance(ownerId);

    const adminList = await admin.get<{ requests: { id: string; accountNumber: string }[] }>("/api/admin/withdrawals");
    expect(adminList.data.requests.find((r) => r.id === id)?.accountNumber).toBe("•••• 1112");

    const reveal = await admin.get(`/api/admin/withdrawals/${id}`);
    expect(reveal.data.accountNumber).toBe("9990001112");
    expect(await prisma.auditLog.findFirst({ where: { action: "withdrawal.reveal_account", entityId: id } })).toBeTruthy();

    const approve = await admin.patch(`/api/admin/withdrawals/${id}`, { action: "approve" });
    expect(approve.status).toBe(200);
    expect(await walletBalance(ownerId)).toBe(afterHold);

    const again = await admin.patch(`/api/admin/withdrawals/${id}`, { action: "approve" });
    expect(again.status).toBe(400);
  });

  it("rejects withdrawals larger than the balance", async () => {
    const response = await owner.post("/api/owner/wallet/withdraw", {
      amount: 9_999_999,
      bankName: "BOC",
      accountNumber: "1234567890",
      accountHolderName: "O",
    });
    expect(response.status).toBe(400);
  });

  it("non-admins cannot act on withdrawals", async () => {
    expect((await owner.patch(`/api/admin/withdrawals/${requestId}`, { action: "approve" })).status).toBe(403);
    expect((await owner.get(`/api/admin/withdrawals/${requestId}`)).status).toBe(403);
  });
});

describe("#10 reviews", () => {
  let pastBookingId = "";

  it("only allows reviewing bookings that have been played", async () => {
    const playerId = await userId(playerA);
    const past = await prisma.booking.create({
      data: {
        playerId,
        facilityId: ids.facilityId,
        startAt: new Date(Date.now() - 5 * 86_400_000),
        endAt: new Date(Date.now() - 5 * 86_400_000 + 3_600_000),
        totalPrice: 1100,
        ownerAmount: 1000,
        status: "COMPLETED",
        paymentStatus: "PAID",
      },
    });
    pastBookingId = past.id;

    const future = await prisma.booking.findFirstOrThrow({
      where: { playerId, status: "CONFIRMED", startAt: { gt: new Date() } },
    });
    expect((await playerA.post("/api/reviews", { bookingId: future.id, rating: 5 })).status).toBe(400);
    expect((await playerB.post("/api/reviews", { bookingId: past.id, rating: 5 })).status).toBe(404);
    expect((await playerA.post("/api/reviews", { bookingId: past.id, rating: 6 })).status).toBe(400);

    const ok = await playerA.post("/api/reviews", { bookingId: past.id, rating: 4, comment: "Great court" });
    expect(ok.status).toBe(201);
  });

  it("shows reviews publicly with owner replies, and hides moderated ones", async () => {
    const list = await new Client().get<{
      summary: { average: number; count: number };
      reviews: { id: string; reviewer: string; comment: string }[];
    }>(`/api/locations/${ids.locationId}/reviews`);
    expect(list.data.summary).toEqual({ average: 4, count: 1 });
    expect(list.data.reviews[0]).toMatchObject({ reviewer: "Alice T.", comment: "Great court" });

    const reviewId = list.data.reviews[0].id;
    expect((await owner.patch(`/api/owner/reviews/${reviewId}`, { reply: "Thanks!" })).status).toBe(200);
    expect((await playerB.patch(`/api/owner/reviews/${reviewId}`, { reply: "hack" })).status).toBe(403);

    expect((await admin.patch(`/api/admin/reviews/${reviewId}`, { isHidden: true })).status).toBe(200);
    const after = await new Client().get<{ reviews: unknown[] }>(`/api/locations/${ids.locationId}/reviews`);
    expect(after.data.reviews).toHaveLength(0);
    await admin.patch(`/api/admin/reviews/${reviewId}`, { isHidden: false });
  });

  it("offers a receipt for paid bookings to the player only", async () => {
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: pastBookingId } });
    const mine = await playerA.get(`/player/bookings/${booking.id}/receipt`);
    expect(mine.status).toBe(200);
    expect(mine.text).toContain("Total paid");

    const theirs = await playerB.get(`/player/bookings/${booking.id}/receipt`);
    expect(theirs.status).toBe(404);
    expect(theirs.text).not.toContain("Total paid");
  });
});

describe("#16 favourites", () => {
  it("saves, lists and removes a venue", async () => {
    expect((await playerA.post("/api/player/favorites", { locationId: ids.locationId })).status).toBe(200);
    expect((await playerA.post("/api/player/favorites", { locationId: ids.locationId })).status).toBe(200);

    const list = await playerA.get<{ favorites: { id: string }[] }>("/api/player/favorites");
    expect(list.data.favorites.map((f) => f.id)).toEqual([ids.locationId]);

    const page = await playerA.get("/player/favorites");
    expect(page.text).toContain(`E2E Arena ${suffix}`);

    await playerA.delete("/api/player/favorites", { locationId: ids.locationId });
    const empty = await playerA.get<{ favorites: unknown[] }>("/api/player/favorites");
    expect(empty.data.favorites).toHaveLength(0);
  });
});

describe("#11 photo galleries", () => {
  it("only accepts our own Cloudinary images and enforces ownership", async () => {
    const path = `/api/owner/locations/${ids.locationId}/images`;
    expect((await owner.post(path, { url: "https://evil.example.com/x.jpg" })).status).toBe(400);

    const cloud = process.env.CLOUDINARY_CLOUD_NAME ?? "demo";
    const url = `https://res.cloudinary.com/${cloud}/image/upload/v1/locations/e2e.jpg`;
    const added = await owner.post<{ image: { id: string } }>(path, { url });
    expect(added.status).toBe(201);

    expect((await playerA.post(path, { url })).status).toBe(403);

    const list = await owner.get<{ images: { url: string }[] }>(path);
    expect(list.data.images.map((i) => i.url)).toEqual([url]);

    expect((await owner.delete(`${path}?imageId=${added.data.image.id}`)).status).toBe(200);

    const facilityPath = `/api/owner/facilities/${ids.facilityId}/images`;
    const facilityImage = await owner.post(facilityPath, { url });
    expect(facilityImage.status).toBe(201);
    expect((await owner.get<{ images: unknown[] }>(facilityPath)).data.images).toHaveLength(1);
  });
});

describe("#12 scheduled jobs", () => {
  it("requires the cron secret", async () => {
    expect((await new Client().get("/api/cron")).status).toBe(401);
    const wrong = await new Client().request("GET", "/api/cron", undefined, { authorization: "Bearer nope" });
    expect(wrong.status).toBe(401);
  });

  it("completes finished bookings and sends reminders once", async () => {
    const playerId = await userId(playerB);
    const finished = await prisma.booking.create({
      data: {
        playerId,
        facilityId: ids.facility2Id,
        startAt: new Date(Date.now() - 3 * 3_600_000),
        endAt: new Date(Date.now() - 2 * 3_600_000),
        totalPrice: 1100,
        status: "CONFIRMED",
        paymentStatus: "PAID",
      },
    });
    const upcoming = await prisma.booking.create({
      data: {
        playerId,
        facilityId: ids.facility2Id,
        startAt: new Date(Date.now() + 90 * 60_000),
        endAt: new Date(Date.now() + 150 * 60_000),
        totalPrice: 1100,
        status: "CONFIRMED",
        paymentStatus: "PAID",
      },
    });

    const call = () =>
      new Client().request("GET", "/api/cron", undefined, { authorization: `Bearer ${process.env.CRON_SECRET}` });
    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);

    expect((await prisma.booking.findUniqueOrThrow({ where: { id: finished.id } })).status).toBe("COMPLETED");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: upcoming.id } })).reminderSentAt).toBeTruthy();
    const reminders = await prisma.notification.findMany({ where: { bookingId: upcoming.id, type: "BOOKING_REMINDER" } });
    expect(reminders).toHaveLength(1);

    await prisma.booking.update({ where: { id: upcoming.id }, data: { status: "CANCELLED" } });
  });
});

describe("#13 earnings export", () => {
  it("downloads the owner's ledger as CSV", async () => {
    const response = await owner.get("/api/owner/earnings/export");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.text).toContain('"Category"');
    expect(response.text).toContain("BOOKING_EARNING");
    expect(response.text).toContain("EARNING_REVERSAL");
    expect((await playerA.get("/api/owner/earnings/export")).status).toBe(403);
  });
});

describe("#8 admin role changes", () => {
  it("are audit-logged and revoke the target's sessions", async () => {
    const target = new Client();
    await prisma.user.create({ data: { phone: target.phone } });
    ids.users.push(await userId(target));
    await target.signIn();

    const targetId = await userId(target);
    const response = await admin.patch(`/api/admin/users/${targetId}/role`, { role: "OWNER" });
    expect(response.status).toBe(200);

    expect((await target.get("/api/auth/session")).data).toMatchObject({ authenticated: false });
    const audit = await prisma.auditLog.findFirst({ where: { action: "user.role_change", entityId: targetId } });
    expect(audit?.metadata).toMatchObject({ from: "PLAYER", to: "OWNER" });

    const logPage = await admin.get("/admin/audit?action=user.");
    expect(logPage.status).toBe(200);
    expect(logPage.text).toContain("user.role_change");
  });
});

describe("staff account takeover fix", () => {
  it("won't convert an existing player into staff or reset their password", async () => {
    const response = await owner.post(`/api/owner/locations/${ids.locationId}/staff`, {
      phone: playerA.phone,
      password: "attacker-chosen-1",
    });
    expect(response.status).toBe(400);

    const login = await new Client(playerA.phone).post("/api/auth/login", {
      phone: playerA.phone,
      password: "attacker-chosen-1",
    });
    expect(login.status).toBe(401);
    expect((await prisma.user.findUniqueOrThrow({ where: { phone: playerA.phone } })).role).toBe("PLAYER");
  });
});

describe("#17 privacy: export and deletion", () => {
  it("exports the player's data", async () => {
    const response = await playerA.get<{ profile: { phone: string }; bookings: unknown[] }>("/api/account/export");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.data.profile.phone).toBe(playerA.phone);
    expect(response.data.bookings.length).toBeGreaterThan(0);
  });

  it("blocks deletion while bookings are upcoming", async () => {
    const response = await playerA.delete("/api/account", { confirm: "DELETE" });
    expect(response.status).toBe(409);
    expect(response.data.code).toBe("HAS_UPCOMING_BOOKINGS");
  });

  it("requires consent to forfeit wallet credit, then anonymises the account", async () => {
    const client = new Client();
    const user = await prisma.user.create({
      data: { phone: client.phone, firstName: "Del", lastName: "Me", email: "del@example.com" },
    });
    ids.users.push(user.id);
    await prisma.wallet.create({ data: { userId: user.id, balance: 50 } });
    await client.signIn();

    expect((await client.delete("/api/account", { confirm: "nope" })).status).toBe(400);
    const needsConsent = await client.delete("/api/account", { confirm: "DELETE" });
    expect(needsConsent.data.code).toBe("HAS_BALANCE");

    const response = await client.delete("/api/account", { confirm: "DELETE", forfeitWalletBalance: true });
    expect(response.status).toBe(200);

    const deleted = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(deleted).toMatchObject({ firstName: null, lastName: null, email: null, passwordHash: null });
    expect(deleted.phone).toBe(`deleted:${user.id}`);
    expect(deleted.deletedAt).toBeTruthy();

    const session = await client.get("/api/auth/session");
    expect(session.data).toMatchObject({ authenticated: false });
  });
});

describe("#18 pages, SEO and error handling", () => {
  it("serves robots.txt and a sitemap with venue pages", async () => {
    const robots = await new Client().get("/robots.txt");
    expect(robots.text).toContain("Sitemap:");
    expect(robots.text).toContain("Disallow: /api/");

    const sitemap = await new Client().get("/sitemap.xml");
    expect(sitemap.status).toBe(200);
    expect(sitemap.text).toContain(`/locations/${ids.locationId}`);
  });

  it("renders the public venue page with metadata and structured data", async () => {
    const page = await new Client().get(`/locations/${ids.locationId}`);
    expect(page.status).toBe(200);
    expect(page.text).toContain(`<title>E2E Arena ${suffix}, Colombo | BookMyPlay</title>`);
    expect(page.text).toContain("application/ld+json");
    expect(page.text).toContain("SportsActivityLocation");
  });

  it("returns the custom 404 for unknown pages and venues", async () => {
    const unknown = await new Client().get(`/definitely-not-a-page-${suffix}`);
    expect(unknown.status).toBe(404);
    expect(unknown.text).toContain("Page not found");

    const venue = await new Client().get(`/locations/does-not-exist-${suffix}`);
    expect(venue.status).toBe(404);
  });

  it("serves the terms and privacy pages", async () => {
    for (const path of ["/terms", "/privacy"]) {
      const page = await new Client().get(path);
      expect(page.status).toBe(200);
    }
  });

  it("no longer serves the removed stub routes", async () => {
    expect((await new Client().get("/pickup-games/new")).status).toBe(404);
    expect((await new Client().get("/sign-in")).status).toBe(404);
  });
});

describe("court search and booking from the venue page", () => {
  const date = colomboDate(50);

  type SlotsResponse = {
    facilities: { id: string; slots: { startTime: string; available: boolean; pricePerHour: number }[] }[];
  };

  it("search returns courts with no location, and filters by city", async () => {
    const client = new Client();
    const base = `/api/player/search?sportId=${ids.sportId}&date=${date}&period=night`;

    const all = await client.get<{ facilities: { id: string; location: { city: string } }[] }>(base);
    expect(all.status).toBe(200);
    expect(all.data.facilities.map((f) => f.id)).toContain(ids.facilityId);

    const colombo = await client.get<{ facilities: { id: string }[] }>(`${base}&city=colombo`);
    expect(colombo.data.facilities.map((f) => f.id)).toContain(ids.facilityId);

    const kandy = await client.get<{ facilities: { id: string }[] }>(`${base}&city=Kandy`);
    expect(kandy.data.facilities.map((f) => f.id)).not.toContain(ids.facilityId);
  });

  it("lists every court's slots for the whole day on the venue", async () => {
    const response = await new Client().get<SlotsResponse>(`/api/locations/${ids.locationId}/slots?date=${date}`);
    expect(response.status).toBe(200);

    const court = response.data.facilities.find((f) => f.id === ids.facilityId);
    expect(court?.slots).toHaveLength(24);
    expect(court?.slots.every((s) => s.available && s.pricePerHour === 1100)).toBe(true);

    expect((await new Client().get(`/api/locations/${ids.locationId}/slots?date=nope`)).status).toBe(400);
  });

  it("shows a slot as taken while someone holds it, in search and on the venue", async () => {
    const hold = await book(playerA, date, 19, 21);
    expect(hold.status).toBe(200);

    const venue = await new Client().get<SlotsResponse>(`/api/locations/${ids.locationId}/slots?date=${date}`);
    const court = venue.data.facilities.find((f) => f.id === ids.facilityId);
    const available = Object.fromEntries(court!.slots.map((s) => [s.startTime, s.available]));
    expect([available["18:00"], available["19:00"], available["20:00"], available["21:00"]]).toEqual([
      true,
      false,
      false,
      true,
    ]);

    const search = await new Client().get<{ facilities: { id: string; slots: { startTime: string; available: boolean }[] }[] }>(
      `/api/player/search?sportId=${ids.sportId}&date=${date}&period=night`,
    );
    const searched = search.data.facilities.find((f) => f.id === ids.facilityId);
    expect(searched?.slots.find((s) => s.startTime === "19:00")?.available).toBe(false);

    await playerA.post("/api/bookings/cancel", { bookingId: hold.data.bookingId });
  });

  it("renders the booking section when linked from a court card", async () => {
    const page = await new Client().get(
      `/locations/${ids.locationId}?sport=${ids.sportId}&date=${date}&court=${ids.facilityId}`,
    );
    expect(page.status).toBe(200);
    expect(page.text).toContain("Book a court");
  });
});

describe("closing the venue", () => {
  it("deactivating a location requires confirming its bookings, then hides it", async () => {
    const ask = await owner.patch(`/api/owner/locations/${ids.locationId}`, { isActive: false });
    expect(ask.status).toBe(409);

    const confirm = await owner.patch(`/api/owner/locations/${ids.locationId}`, {
      isActive: false,
      cancelExistingBookings: true,
      reason: "Renovation",
    });
    expect(confirm.status).toBe(200);
    expect(Number(confirm.data.cancelledBookings)).toBeGreaterThan(0);

    const remaining = await prisma.booking.count({
      where: { facility: { locationId: ids.locationId }, status: { in: ["PENDING", "CONFIRMED"] }, endAt: { gt: new Date() } },
    });
    expect(remaining).toBe(0);

    expect((await new Client().get(`/locations/${ids.locationId}`)).status).toBe(404);
  });

  it("keeps every wallet consistent with its ledger", async () => {
    for (const client of [owner, playerA, playerB]) {
      const id = await userId(client);
      const rows = await ledger(id);
      const net = rows.reduce((sum, t) => sum + (t.type === "CREDIT" ? 1 : -1) * Number(t.amount), 0);
      expect(Math.round(net * 100) / 100).toBe(await walletBalance(id));
    }
  });
});

