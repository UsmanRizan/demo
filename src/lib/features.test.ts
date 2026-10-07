import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isPayAtVenueEnabled } from "@/lib/features";

const original = process.env.PAY_AT_VENUE_ENABLED;

function setFlag(value: string | undefined) {
  if (value === undefined) {
    delete process.env.PAY_AT_VENUE_ENABLED;
  } else {
    process.env.PAY_AT_VENUE_ENABLED = value;
  }
}

describe("isPayAtVenueEnabled", () => {
  beforeEach(() => {
    setFlag(original);
  });

  afterEach(() => {
    setFlag(original);
  });

  it("is enabled when the flag is not set", () => {
    setFlag(undefined);

    expect(isPayAtVenueEnabled()).toBe(true);
  });

  it.each(["false", "FALSE", " false ", "0", "off", "no"])(
    "treats %o as disabled",
    (value) => {
      setFlag(value);

      expect(isPayAtVenueEnabled()).toBe(false);
    },
  );

  it.each(["true", "1", "on", "yes"])("treats %o as enabled", (value) => {
    setFlag(value);

    expect(isPayAtVenueEnabled()).toBe(true);
  });
});
