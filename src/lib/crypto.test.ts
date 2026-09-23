import { beforeEach, describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret, isEncrypted, lastFour, maskAccountNumber } from "@/lib/crypto";

describe("field encryption", () => {
  beforeEach(() => {
    process.env.DATA_ENCRYPTION_KEY = "11".repeat(32);
  });

  it("round-trips a value", () => {
    const encrypted = encryptSecret("0012345678");

    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted).not.toContain("0012345678");
    expect(decryptSecret(encrypted)).toBe("0012345678");
  });

  it("uses a fresh IV every time", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("detects tampering", () => {
    const encrypted = encryptSecret("0012345678");
    const parts = encrypted.split(":");
    parts[4] = Buffer.from("tampered").toString("base64url");

    expect(() => decryptSecret(parts.join(":"))).toThrow();
  });

  it("fails with the wrong key", () => {
    const encrypted = encryptSecret("0012345678");
    process.env.DATA_ENCRYPTION_KEY = "22".repeat(32);

    expect(() => decryptSecret(encrypted)).toThrow();
  });

  it("passes legacy plaintext through", () => {
    expect(decryptSecret("0012345678")).toBe("0012345678");
  });

  it("rejects keys of the wrong length", () => {
    process.env.DATA_ENCRYPTION_KEY = "abcd";

    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
  });
});

describe("masking", () => {
  it("keeps only the last four characters", () => {
    expect(lastFour("0012 3456 78")).toBe("5678");
    expect(maskAccountNumber("5678")).toBe("•••• 5678");
    expect(maskAccountNumber(null)).toBe("••••");
  });
});
