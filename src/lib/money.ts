import { PLATFORM_FEE_PERCENTAGE } from "@/lib/constants";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * The owner's share of a player-facing total, used for bookings created before
 * Booking.ownerAmount was stored.
 */
export function ownerShareFromTotal(total: number): number {
  return roundMoney(total / (1 + PLATFORM_FEE_PERCENTAGE / 100));
}

export function formatLkr(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;

  return `Rs. ${num.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
