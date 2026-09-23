import { describe, expect, it } from "vitest";

import { ownerShareFromTotal, roundMoney } from "@/lib/money";
import { normalizePhone, isValidDate } from "@/lib/utils";

describe("money", () => {
  it("rounds half-cents correctly", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it("derives the owner share from a fee-inclusive total", () => {
    expect(ownerShareFromTotal(1100)).toBe(1000);
    expect(ownerShareFromTotal(1320)).toBe(1200);
  });
});

describe("utils", () => {
  it("normalises Sri Lankan phone numbers", () => {
    expect(normalizePhone("0771234567")).toBe("94771234567");
    expect(normalizePhone("+94 77 123 4567")).toBe("94771234567");
  });

  it("validates calendar dates", () => {
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2027-02-29")).toBe(false);
    expect(isValidDate("2027-1-1")).toBe(false);
  });
});
