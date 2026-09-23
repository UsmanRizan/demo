import { describe, expect, it } from "vitest";

import {
  availabilitySchema,
  bookingRequestSchema,
  locationCreateSchema,
  parseJson,
  sendOtpSchema,
  withdrawalRequestSchema,
} from "@/lib/validation";

const request = (body: unknown) =>
  new Request("http://test/api", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("parseJson", () => {
  it("returns typed data for a valid body", async () => {
    const result = await parseJson(request({ phone: "077 123 4567" }), sendOtpSchema);

    expect(result.data).toEqual({ phone: "94771234567" });
  });

  it("returns a 400 with the first message for an invalid body", async () => {
    const result = await parseJson(request({ phone: "12345" }), sendOtpSchema);

    expect(result.response?.status).toBe(400);
    expect(await result.response?.json()).toMatchObject({
      error: expect.stringMatching(/Sri Lankan phone/),
      field: "phone",
    });
  });

  it("rejects malformed JSON", async () => {
    const result = await parseJson(request("{not json"), sendOtpSchema);

    expect(result.response?.status).toBe(400);
  });
});

describe("bookingRequestSchema", () => {
  const valid = { facilityId: "f1", date: "2030-01-02", startTime: "18:00", endTime: "19:00" };

  it("defaults repeatWeeks to 1", () => {
    expect(bookingRequestSchema.parse(valid).repeatWeeks).toBe(1);
  });

  it("limits repeatWeeks to 1-12", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, repeatWeeks: 13 }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, repeatWeeks: 0 }).success).toBe(false);
  });

  it("rejects impossible dates and bad times", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, date: "2030-02-30" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...valid, startTime: "7pm" }).success).toBe(false);
  });
});

describe("withdrawalRequestSchema", () => {
  const valid = {
    amount: 500,
    bankName: " Commercial Bank ",
    accountNumber: "8001234567",
    accountHolderName: "A Perera",
  };

  it("trims fields", () => {
    expect(withdrawalRequestSchema.parse(valid).bankName).toBe("Commercial Bank");
  });

  it("enforces the Rs. 100 minimum and numeric amounts", () => {
    expect(withdrawalRequestSchema.safeParse({ ...valid, amount: 99 }).success).toBe(false);
    expect(withdrawalRequestSchema.safeParse({ ...valid, amount: "500" }).success).toBe(false);
  });
});

describe("locationCreateSchema", () => {
  const valid = { name: "Arena", address: "1 Main St", city: "Colombo", latitude: 6.9, longitude: 79.8 };

  it("rejects a missing map pin instead of treating it as 0,0", () => {
    expect(locationCreateSchema.safeParse({ ...valid, latitude: null }).success).toBe(false);
    expect(locationCreateSchema.safeParse({ ...valid, longitude: "" }).success).toBe(false);
  });

  it("accepts numeric strings", () => {
    expect(locationCreateSchema.parse({ ...valid, latitude: "6.9" }).latitude).toBe(6.9);
  });
});

describe("availabilitySchema", () => {
  it("requires times unless open 24 hours", () => {
    expect(
      availabilitySchema.safeParse({ availability: [{ dayOfWeek: 1, isTwentyFourHour: true }] }).success,
    ).toBe(true);
    expect(availabilitySchema.safeParse({ availability: [{ dayOfWeek: 1 }] }).success).toBe(false);
  });

  it("rejects duplicate days and inverted hours", () => {
    const day = { dayOfWeek: 1, startTime: "06:00", endTime: "22:00" };

    expect(availabilitySchema.safeParse({ availability: [day, day] }).success).toBe(false);
    expect(
      availabilitySchema.safeParse({ availability: [{ ...day, startTime: "23:00" }] }).success,
    ).toBe(false);
  });
});
