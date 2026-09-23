import { describe, expect, it } from "vitest";

import { buildSlots, openingWindow } from "@/lib/availability";
import { colomboDateTime } from "@/lib/bookings";

const DATE = "2030-01-02"; // Wednesday
const BEFORE = new Date("2029-12-31T00:00:00Z");
const opening = { startTime: "06:00", endTime: "22:00", isTwentyFourHour: false };

const base = {
  date: DATE,
  opening,
  basePrice: 1000,
  rules: [],
  taken: [],
  blocked: false,
  now: BEFORE,
};

describe("openingWindow", () => {
  it("treats 23:59 and 24-hour venues as open until midnight", () => {
    expect(openingWindow({ startTime: "06:00", endTime: "23:59", isTwentyFourHour: false })).toEqual([360, 1440]);
    expect(openingWindow({ startTime: "00:00", endTime: "00:00", isTwentyFourHour: true })).toEqual([0, 1440]);
  });
});

describe("buildSlots", () => {
  it("generates hourly slots across opening hours with the player price", () => {
    const slots = buildSlots(base);

    expect(slots).toHaveLength(16);
    expect(slots[0]).toMatchObject({ startTime: "06:00", endTime: "07:00", available: true, pricePerHour: 1100 });
    expect(slots.at(-1)).toMatchObject({ startTime: "21:00", endTime: "22:00" });
  });

  it("returns nothing when the venue is closed that day", () => {
    expect(buildSlots({ ...base, opening: null })).toEqual([]);
  });

  it("limits to a time range", () => {
    const slots = buildSlots({ ...base, range: [18 * 60, 24 * 60] });
    expect(slots.map((s) => s.startTime)).toEqual(["18:00", "19:00", "20:00", "21:00"]);
  });

  it("marks slots overlapping bookings or holds as unavailable", () => {
    const slots = buildSlots({
      ...base,
      taken: [{ startAt: colomboDateTime(DATE, "10:00"), endAt: colomboDateTime(DATE, "12:00") }],
    });
    const byStart = Object.fromEntries(slots.map((s) => [s.startTime, s.available]));

    expect(byStart["09:00"]).toBe(true);
    expect(byStart["10:00"]).toBe(false);
    expect(byStart["11:00"]).toBe(false);
    expect(byStart["12:00"]).toBe(true);
  });

  it("marks past slots unavailable using Colombo time, not server time", () => {
    // 10:30 in Colombo is 05:00 UTC.
    const slots = buildSlots({ ...base, now: new Date(`${DATE}T05:00:00Z`) });
    const byStart = Object.fromEntries(slots.map((s) => [s.startTime, s.available]));

    expect(byStart["10:00"]).toBe(false);
    expect(byStart["11:00"]).toBe(true);
  });

  it("blocks every slot on a blocked date", () => {
    expect(buildSlots({ ...base, blocked: true }).every((s) => !s.available)).toBe(true);
  });

  it("applies peak pricing per slot", () => {
    const slots = buildSlots({
      ...base,
      rules: [{ startTime: "18:00", endTime: "22:00", percentage: 20, dayOfWeek: null, isActive: true }],
    });

    expect(slots.find((s) => s.startTime === "17:00")?.pricePerHour).toBe(1100);
    expect(slots.find((s) => s.startTime === "18:00")).toMatchObject({ pricePerHour: 1320, surgePercentage: 20 });
  });
});
