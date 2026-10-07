import { describe, expect, it } from "vitest";

import { buildSlots } from "@/lib/availability";
import {
  coversRange,
  expandHourRanges,
  mergeHourlySelection,
  openingRanges,
} from "@/lib/opening-hours";

const base = { basePrice: 1000, rules: [], taken: [], blocked: false };
// Fixed "now" far in the past so every generated slot counts as bookable.
const now = new Date("2020-01-01T00:00:00.000Z");

describe("mergeHourlySelection", () => {
  it("merges a contiguous run into one range", () => {
    expect(mergeHourlySelection([8, 9, 10])).toEqual([
      { start: "08:00", end: "11:00" },
    ]);
  });

  it("splits a gap into separate ranges so the break is not bookable", () => {
    expect(mergeHourlySelection([8, 9, 10, 14, 15])).toEqual([
      { start: "08:00", end: "11:00" },
      { start: "14:00", end: "16:00" },
    ]);
  });

  it("handles the last hour of the day as 23:00-24:00", () => {
    expect(mergeHourlySelection([23])).toEqual([
      { start: "23:00", end: "24:00" },
    ]);
  });

  it("sorts, de-duplicates and ignores out-of-range values", () => {
    expect(mergeHourlySelection([24, -1, 9, 8, 8, 1.5, 9])).toEqual([
      { start: "08:00", end: "10:00" },
    ]);
  });

  it("returns nothing when no hours are selected", () => {
    expect(mergeHourlySelection([])).toEqual([]);
  });

  it("selects the whole day when every hour is chosen", () => {
    const all = Array.from({ length: 24 }, (_, i) => i);

    expect(mergeHourlySelection(all)).toEqual([
      { start: "00:00", end: "24:00" },
    ]);
  });
});

describe("expandHourRanges", () => {
  it("round-trips a merged selection", () => {
    const hours = [8, 9, 10, 14, 15, 16];

    expect(expandHourRanges(mergeHourlySelection(hours))).toEqual(hours);
  });

  it("round-trips every hour of the day", () => {
    const all = Array.from({ length: 24 }, (_, i) => i);

    expect(expandHourRanges(mergeHourlySelection(all))).toEqual(all);
  });
});

describe("openingRanges", () => {
  it("prefers explicit hours over the envelope", () => {
    const ranges = openingRanges({
      startTime: "08:00",
      endTime: "22:00",
      isTwentyFourHour: false,
      hours: [
        { start: "08:00", end: "12:00" },
        { start: "14:00", end: "22:00" },
      ],
    });

    expect(ranges).toEqual([
      [480, 720],
      [840, 1320],
    ]);
  });

  it("falls back to the envelope when hours are missing", () => {
    const ranges = openingRanges({
      startTime: "09:00",
      endTime: "17:00",
      isTwentyFourHour: false,
      hours: null,
    });

    expect(ranges).toEqual([[540, 1020]]);
  });

  it("treats 23:59 as midnight when falling back", () => {
    expect(
      openingRanges({
        startTime: "06:00",
        endTime: "23:59",
        isTwentyFourHour: false,
      }),
    ).toEqual([[360, 1440]]);
  });

  it("ignores malformed stored ranges instead of throwing", () => {
    const ranges = openingRanges({
      startTime: "06:00",
      endTime: "12:00",
      isTwentyFourHour: false,
      hours: [
        { start: "oops", end: "nope" },
        { start: "10:00", end: "09:00" },
        null,
        { start: "06:00", end: "09:00" },
      ],
    });

    expect(ranges).toEqual([[360, 540]]);
  });

  it("returns the full day for a 24-hour venue regardless of stored hours", () => {
    expect(
      openingRanges({
        startTime: "00:00",
        endTime: "24:00",
        isTwentyFourHour: true,
        hours: [{ start: "08:00", end: "12:00" }],
      }),
    ).toEqual([[0, 1440]]);
  });
});

describe("buildSlots with disjoint opening hours", () => {
  it("does not offer slots inside a break between two ranges", () => {
    const slots = buildSlots({
      ...base,
      date: "2026-10-07",
      now,
      opening: {
        startTime: "08:00",
        endTime: "16:00",
        isTwentyFourHour: false,
        hours: [
          { start: "08:00", end: "11:00" },
          { start: "14:00", end: "16:00" },
        ],
      },
    });

    const times = slots.map((s) => s.startTime);

    expect(times).toEqual([
      "08:00", "09:00", "10:00", // 08:00-11:00
      "14:00", "15:00", // 14:00-16:00
    ]);
    // The 11:00-14:00 gap must not appear.
    expect(times).not.toContain("11:00");
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("13:00");
  });

  it("still spans one contiguous window when only the envelope is set", () => {
    const slots = buildSlots({
      ...base,
      date: "2026-10-07",
      now,
      opening: {
        startTime: "09:00",
        endTime: "12:00",
        isTwentyFourHour: false,
      },
    });

    expect(slots.map((s) => s.startTime)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("clamps ranges against the requested period", () => {
    const slots = buildSlots({
      ...base,
      date: "2026-10-07",
      now,
      range: [18 * 60, 24 * 60],
      opening: {
        startTime: "08:00",
        endTime: "16:00",
        isTwentyFourHour: false,
        hours: [
          { start: "08:00", end: "12:00" },
          { start: "14:00", end: "16:00" },
        ],
      },
    });

    // Neither range reaches the evening period.
    expect(slots).toEqual([]);
  });

  it("still generates 24 slots for a 24-hour venue", () => {
    const slots = buildSlots({
      ...base,
      date: "2026-10-07",
      now,
      opening: {
        startTime: "00:00",
        endTime: "24:00",
        isTwentyFourHour: true,
      },
    });

    expect(slots).toHaveLength(24);
  });
});

describe("coversRange (booking validation)", () => {
  const opening = {
    startTime: "08:00",
    endTime: "16:00",
    isTwentyFourHour: false,
    hours: [
      { start: "08:00", end: "12:00" },
      { start: "14:00", end: "16:00" },
    ],
  };

  it("accepts a slot inside an open range", () => {
    expect(coversRange(opening, "09:00", "10:00")).toBe(true);
    expect(coversRange(opening, "14:00", "16:00")).toBe(true);
  });

  it("rejects a slot inside the gap even though it is inside the envelope", () => {
    // 12:00-13:00 sits between the two open ranges. The envelope is 08:00-16:00,
    // so an envelope-only check would wrongly allow this booking.
    expect(coversRange(opening, "12:00", "13:00")).toBe(false);
    expect(coversRange(opening, "11:00", "13:00")).toBe(false);
  });

  it("rejects slots that overhang a range boundary", () => {
    expect(coversRange(opening, "07:00", "08:00")).toBe(false);
    expect(coversRange(opening, "16:00", "17:00")).toBe(false);
    expect(coversRange(opening, "11:00", "12:00")).toBe(true);
    expect(coversRange(opening, "10:00", "14:00")).toBe(false);
  });
});
