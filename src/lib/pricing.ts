import { eq, and } from "drizzle-orm";

import { db } from "@/lib/prisma";
import { pricingRules } from "@/db/schema";
import { PLATFORM_FEE_PERCENTAGE } from "@/lib/constants";

type PricingRuleRow = {
  startTime: string;
  endTime: string;
  percentage: number;
  dayOfWeek: number | null;
  isActive: boolean;
};

/**
 * Calculate the adjusted price for a specific time slot on a given day.
 *
 * Rules are matched by checking if the slot's start time falls within
 * a rule's time window. Rules with a specific dayOfWeek are checked first,
 * then rules that apply to all days (dayOfWeek is null).
 *
 * If multiple rules match, the one with the highest percentage is used.
 */
export function calculateDynamicPrice(
  basePrice: number,
  slotStartTime: string,
  dayOfWeek: number,
  rules: PricingRuleRow[],
): { adjustedPrice: number; surgePercentage: number } {
  const slotMinutes = timeToMinutes(slotStartTime);

  const matchingRules = rules
    .filter((rule) => {
      if (!rule.isActive) return false;
      const startMinutes = timeToMinutes(rule.startTime);
      const endMinutes = timeToMinutes(rule.endTime);

      // Handle wrap-around (e.g. 18:00 - 00:00 means 18:00 - 24:00)
      if (startMinutes >= endMinutes) {
        return slotMinutes >= startMinutes || slotMinutes < endMinutes;
      }
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    })
    .filter((rule) => rule.dayOfWeek === null || rule.dayOfWeek === dayOfWeek);

  if (matchingRules.length === 0) {
    return { adjustedPrice: basePrice, surgePercentage: 0 };
  }

  // Sort by specificity: day-specific rules first, then by highest percentage
  matchingRules.sort((a, b) => {
    // day-specific rules take priority
    if (a.dayOfWeek !== null && b.dayOfWeek === null) return -1;
    if (a.dayOfWeek === null && b.dayOfWeek !== null) return 1;
    // then by highest percentage
    return b.percentage - a.percentage;
  });

  const bestRule = matchingRules[0];
  const surgeMultiplier = 1 + bestRule.percentage / 100;
  const adjustedPrice = Math.round(basePrice * surgeMultiplier * 100) / 100;

  return {
    adjustedPrice,
    surgePercentage: bestRule.percentage,
  };
}

/**
 * Fetch pricing rules for a location.
 */
export async function getPricingRulesForLocation(
  locationId: string,
): Promise<PricingRuleRow[]> {
  const rules = await db
    .select({
      startTime: pricingRules.startTime,
      endTime: pricingRules.endTime,
      percentage: pricingRules.percentage,
      dayOfWeek: pricingRules.dayOfWeek,
      isActive: pricingRules.isActive,
    })
    .from(pricingRules)
    .where(
      and(eq(pricingRules.locationId, locationId), eq(pricingRules.isActive, true)),
    );

  return rules.map((r) => ({
    startTime: r.startTime,
    endTime: r.endTime,
    percentage: Number(r.percentage),
    dayOfWeek: r.dayOfWeek,
    isActive: r.isActive,
  }));
}

/**
 * Calculate the player price (with platform fee) from an owner's base price.
 */
export function calculatePlayerPrice(ownerPrice: number): number {
  return Math.round(ownerPrice * (1 + PLATFORM_FEE_PERCENTAGE / 100) * 100) / 100;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
