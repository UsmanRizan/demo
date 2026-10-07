/**
 * Runtime feature flags, read from the environment.
 *
 * A flag controls whether a feature is *offered*, never how existing records
 * are interpreted. Turning a flag off must not change the meaning of bookings
 * that were already created while it was on — receipts, reviews, earnings and
 * cancellation rules all keep reading `payAtVenue` normally.
 */

/** Values that count as "off". Anything else, or unset, means "on". */
const OFF = new Set(["false", "0", "off", "no"]);

function flag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();

  // Unset defaults to on, so existing deployments keep working without changes.
  if (!raw) {
    return true;
  }

  return !OFF.has(raw);
}

/**
 * Whether players can choose to pay cash at the venue.
 *
 * When off, the checkout page omits the option and
 * `POST /api/payments/venue/create` refuses, so it cannot be reached by
 * calling the API directly. Bookings already marked pay-at-venue are
 * unaffected and continue to work normally.
 */
export function isPayAtVenueEnabled(): boolean {
  return flag("PAY_AT_VENUE_ENABLED");
}

/** Message shown when someone reaches the endpoint with the feature disabled. */
export const PAY_AT_VENUE_DISABLED_MESSAGE =
  "Paying at the venue is not available. Please pay by card or with your wallet.";
