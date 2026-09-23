import crypto from "crypto";

/**
 * Field-level encryption for sensitive values such as bank account numbers.
 * Format: enc:v1:<iv>:<authTag>:<ciphertext>, all base64url, AES-256-GCM.
 *
 * DATA_ENCRYPTION_KEY must be 32 bytes, given as 64 hex chars or base64.
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;

  if (raw) {
    const key = /^[0-9a-f]{64}$/i.test(raw)
      ? Buffer.from(raw, "hex")
      : Buffer.from(raw, "base64");

    if (key.length !== 32) {
      throw new Error("DATA_ENCRYPTION_KEY must decode to exactly 32 bytes");
    }

    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATA_ENCRYPTION_KEY is not configured");
  }

  // Development fallback so the app runs without extra setup.
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("DATA_ENCRYPTION_KEY or SESSION_SECRET must be configured");
  }

  return crypto.createHash("sha256").update(`data-key:${secret}`).digest();
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

/**
 * Decrypts a value produced by encryptSecret. Legacy plaintext values are
 * returned unchanged so old rows keep working until they are migrated.
 */
export function decryptSecret(value: string): string {
  if (!isEncrypted(value)) {
    return value;
  }

  const [ivPart, tagPart, dataPart] = value.slice(PREFIX.length).split(":");

  if (!ivPart || !tagPart || dataPart === undefined) {
    throw new Error("Malformed encrypted value");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function lastFour(value: string): string {
  return value.replace(/\s/g, "").slice(-4);
}

export function maskAccountNumber(last4: string | null | undefined): string {
  return last4 ? `•••• ${last4}` : "••••";
}
