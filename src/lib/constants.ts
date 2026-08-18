export const PLATFORM_FEE_PERCENTAGE = 10;

export function calculatePlayerPrice(ownerPrice: number): number {
  return Math.round(ownerPrice * (1 + PLATFORM_FEE_PERCENTAGE / 100) * 100) / 100;
}
