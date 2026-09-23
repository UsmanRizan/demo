import { describe, expect, it } from "vitest";

import { calculatePlayerPrice } from "@/lib/constants";
import { calculateDynamicPrice } from "@/lib/pricing";

const rule = (overrides: Partial<Parameters<typeof calculateDynamicPrice>[3][number]>) => ({
  startTime: "18:00",
  endTime: "22:00",
  percentage: 20,
  dayOfWeek: null,
  isActive: true,
  ...overrides,
});

describe("calculateDynamicPrice", () => {
  it("returns the base price when no rule matches", () => {
    expect(calculateDynamicPrice(1000, "10:00", 1, [rule({})])).toEqual({
      adjustedPrice: 1000,
      surgePercentage: 0,
    });
  });

  it("applies a matching peak rule", () => {
    expect(calculateDynamicPrice(1000, "19:00", 1, [rule({})]).adjustedPrice).toBe(1200);
  });

  it("treats the end time as exclusive", () => {
    expect(calculateDynamicPrice(1000, "22:00", 1, [rule({})]).adjustedPrice).toBe(1000);
  });

  it("supports discounts", () => {
    const result = calculateDynamicPrice(1000, "07:00", 1, [
      rule({ startTime: "06:00", endTime: "09:00", percentage: -25 }),
    ]);

    expect(result.adjustedPrice).toBe(750);
  });

  it("handles windows that wrap past midnight", () => {
    const rules = [rule({ startTime: "22:00", endTime: "02:00", percentage: 50 })];

    expect(calculateDynamicPrice(1000, "23:00", 1, rules).adjustedPrice).toBe(1500);
    expect(calculateDynamicPrice(1000, "01:00", 1, rules).adjustedPrice).toBe(1500);
    expect(calculateDynamicPrice(1000, "03:00", 1, rules).adjustedPrice).toBe(1000);
  });

  it("prefers a day-specific rule over an all-days rule", () => {
    const rules = [
      rule({ percentage: 50 }),
      rule({ percentage: 10, dayOfWeek: 6 }),
    ];

    expect(calculateDynamicPrice(1000, "19:00", 6, rules).adjustedPrice).toBe(1100);
    expect(calculateDynamicPrice(1000, "19:00", 5, rules).adjustedPrice).toBe(1500);
  });

  it("ignores inactive rules", () => {
    expect(
      calculateDynamicPrice(1000, "19:00", 1, [rule({ isActive: false })]).adjustedPrice,
    ).toBe(1000);
  });
});

describe("calculatePlayerPrice", () => {
  it("adds the 10% platform fee rounded to cents", () => {
    expect(calculatePlayerPrice(1000)).toBe(1100);
    expect(calculatePlayerPrice(333.33)).toBe(366.66);
  });
});
