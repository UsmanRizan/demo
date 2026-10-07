import { describe, expect, it } from "vitest";

import {
  formatColomboDate,
  isSunday,
  startOfWeek,
  weekContaining,
} from "@/lib/invoices";

/** Colombo calendar date for an instant, as YYYY-MM-DD. */
const colomboDay = (date: Date) => formatColomboDate(date);

describe("startOfWeek", () => {
  it("returns the same instant for every day of a week", () => {
    // 2026-10-04 is a Sunday; the week runs to 2026-10-10.
    const sunday = new Date("2026-10-04T05:00:00.000Z"); // 10:30 Colombo
    const saturday = new Date("2026-10-10T16:59:00.000Z"); // 22:29 Colombo

    const start = startOfWeek(sunday);

    expect(start.toISOString()).toBe("2026-10-03T18:30:00.000Z"); // Sun 00:00 +05:30
    expect(startOfWeek(saturday).getTime()).toBe(start.getTime());
    expect(startOfWeek(new Date("2026-10-07T04:00:00.000Z")).getTime()).toBe(
      start.getTime(),
    );
  });

  it("starts at Colombo midnight, not UTC midnight", () => {
    // 2026-10-04T19:00Z is already Sunday 00:30 in Colombo.
    const start = startOfWeek(new Date("2026-10-04T19:00:00.000Z"));

    expect(colomboDay(start)).toBe("2026-10-04");
    expect(start.getUTCHours()).toBe(18); // 18:30Z === 00:00 +05:30 next day
  });

  it("treats Sunday 00:00 Colombo as the first instant, not the previous day", () => {
    // 2026-10-03T18:29Z is Saturday 23:59 Colombo -> belongs to the week before.
    const saturdayNight = new Date("2026-10-03T18:29:00.000Z");

    expect(colomboDay(startOfWeek(saturdayNight))).toBe("2026-09-27");
  });
});

describe("weekContaining", () => {
  it("splits a booking exactly on the Sunday boundary into the next week", () => {
    const saturday2359 = new Date("2026-10-10T18:29:00.000Z"); // Sat 23:59 +05:30
    const sunday0000 = new Date("2026-10-10T18:30:00.000Z"); // Sun 00:00 +05:30

    const a = weekContaining(saturday2359);
    const b = weekContaining(sunday0000);

    expect(colomboDay(a.periodStart)).toBe("2026-10-04");
    expect(colomboDay(b.periodStart)).toBe("2026-10-11");
    expect(b.periodStart.getTime() - a.periodStart.getTime()).toBe(
      7 * 86_400_000,
    );
  });

  it("ends the period at the last millisecond of Saturday", () => {
    const { periodStart, periodEnd } = weekContaining(
      new Date("2026-10-07T04:00:00.000Z"),
    );

    expect(colomboDay(periodEnd)).toBe("2026-10-10");
    // periodEnd is the next Sunday minus 1ms.
    expect(periodEnd.getTime() - periodStart.getTime()).toBe(
      7 * 86_400_000 - 1,
    );
  });
});

describe("isSunday", () => {
  it("detects Sunday in Colombo time across the UTC date line", () => {
    // 2026-10-04T02:00Z is Sunday 07:30 in Colombo.
    expect(isSunday(new Date("2026-10-04T02:00:00.000Z"))).toBe(true);
    // 2026-10-04T20:00Z is already Monday 01:30 in Colombo.
    expect(isSunday(new Date("2026-10-04T20:00:00.000Z"))).toBe(false);
  });
});
