import { describe, expect, it } from "vitest";

import {
  addDaysToDate,
  BookingError,
  colomboDateTime,
  dayOfWeekForDate,
  isOverlapViolation,
  quoteSlot,
  weeklySlots,
} from "@/lib/bookings";

type Facility = Parameters<typeof quoteSlot>[0];

function makeFacility({
  price = 1000,
  availability = [{ dayOfWeek: 3, startTime: "06:00", endTime: "22:00", isTwentyFourHour: false }],
  rules = [] as { startTime: string; endTime: string; percentage: number; dayOfWeek: number | null }[],
} = {}): Facility {
  return {
    id: "f1",
    locationId: "l1",
    name: "Court 1",
    description: null,
    imageUrl: null,
    price: price as unknown as Facility["price"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    sports: [],
    location: {
      id: "l1",
      availabilities: availability.map((a, i) => ({
        id: `a${i}`,
        locationId: "l1",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...a,
      })),
      pricingRules: rules.map((r, i) => ({
        id: `r${i}`,
        locationId: "l1",
        name: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...r,
      })),
    },
  } as unknown as Facility;
}

// 2030-01-02 is a Wednesday (dayOfWeek 3).
const WEDNESDAY = "2030-01-02";
const NOW = new Date("2029-12-31T00:00:00Z");

describe("date helpers", () => {
  it("computes the weekday from the calendar date, not the server timezone", () => {
    expect(dayOfWeekForDate(WEDNESDAY)).toBe(3);
    expect(dayOfWeekForDate("2026-09-27")).toBe(0);
  });

  it("adds days across month and year boundaries", () => {
    expect(addDaysToDate("2029-12-26", 7)).toBe("2030-01-02");
    expect(addDaysToDate("2028-02-26", 7)).toBe("2028-03-04");
  });

  it("interprets times as Colombo local time (UTC+05:30)", () => {
    expect(colomboDateTime(WEDNESDAY, "06:00").toISOString()).toBe("2030-01-02T00:30:00.000Z");
    expect(colomboDateTime(WEDNESDAY, "24:00").toISOString()).toBe("2030-01-02T18:30:00.000Z");
  });

  it("builds weekly slots on the same weekday", () => {
    const slots = weeklySlots({ date: WEDNESDAY, startTime: "18:00", endTime: "19:00" }, 4);

    expect(slots.map((s) => s.date)).toEqual([
      "2030-01-02",
      "2030-01-09",
      "2030-01-16",
      "2030-01-23",
    ]);
    expect(slots.every((s) => dayOfWeekForDate(s.date) === 3)).toBe(true);
  });
});

describe("quoteSlot", () => {
  it("prices a slot with the platform fee and records the owner share", () => {
    const quote = quoteSlot(
      makeFacility(),
      { date: WEDNESDAY, startTime: "10:00", endTime: "12:00" },
      NOW,
    );

    expect(quote.totalPrice).toBe(2200);
    expect(quote.ownerAmount).toBe(2000);
  });

  it("applies pricing rules to both the player price and the owner share", () => {
    const quote = quoteSlot(
      makeFacility({ rules: [{ startTime: "18:00", endTime: "22:00", percentage: 20, dayOfWeek: null }] }),
      { date: WEDNESDAY, startTime: "18:00", endTime: "19:00" },
      NOW,
    );

    expect(quote.ownerAmount).toBe(1200);
    expect(quote.totalPrice).toBe(1320);
  });

  it("rejects slots outside opening hours", () => {
    expect(() =>
      quoteSlot(makeFacility(), { date: WEDNESDAY, startTime: "21:00", endTime: "23:00" }, NOW),
    ).toThrow(/opening hours/);
  });

  it("rejects days the venue is closed", () => {
    expect(() =>
      quoteSlot(makeFacility(), { date: "2030-01-03", startTime: "10:00", endTime: "11:00" }, NOW),
    ).toThrow(/closed/);
  });

  it("rejects past and zero-length slots", () => {
    expect(() =>
      quoteSlot(makeFacility(), { date: WEDNESDAY, startTime: "10:00", endTime: "11:00" }, new Date("2031-01-01")),
    ).toThrow(/past/);
    expect(() =>
      quoteSlot(makeFacility(), { date: WEDNESDAY, startTime: "10:00", endTime: "10:00" }, NOW),
    ).toThrow(BookingError);
  });

  it("allows the last hour when closing time is 23:59 (until midnight)", () => {
    const facility = makeFacility({
      availability: [{ dayOfWeek: 3, startTime: "06:00", endTime: "23:59", isTwentyFourHour: false }],
    });

    expect(
      quoteSlot(facility, { date: WEDNESDAY, startTime: "23:00", endTime: "24:00" }, NOW).totalPrice,
    ).toBe(1100);
  });

  it("allows any time at 24-hour venues", () => {
    const facility = makeFacility({
      availability: [{ dayOfWeek: 3, startTime: "00:00", endTime: "24:00", isTwentyFourHour: true }],
    });

    expect(
      quoteSlot(facility, { date: WEDNESDAY, startTime: "02:00", endTime: "03:00" }, NOW).totalPrice,
    ).toBe(1100);
  });
});

describe("isOverlapViolation", () => {
  it("detects the exclusion constraint however the error is wrapped", () => {
    expect(isOverlapViolation(new Error('violates exclusion constraint "Booking_no_overlap"'))).toBe(true);
    expect(isOverlapViolation({ cause: { code: "23P01" } })).toBe(true);
    expect(isOverlapViolation(Object.assign(new Error("x"), { meta: { code: "23P01" } }))).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isOverlapViolation(new Error("connection reset"))).toBe(false);
    expect(isOverlapViolation(null)).toBe(false);
  });
});
