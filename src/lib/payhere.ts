import crypto from "crypto";

const merchantId = process.env.PAYHERE_MERCHANT_ID;

const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

if (!merchantId) {
  throw new Error("PAYHERE_MERCHANT_ID is not configured");
}

if (!merchantSecret) {
  throw new Error("PAYHERE_MERCHANT_SECRET is not configured");
}

export const PAYHERE_CHECKOUT_URL =
  process.env.PAYHERE_MODE === "live"
    ? "https://www.payhere.lk/pay/checkout"
    : "https://sandbox.payhere.lk/pay/checkout";

function md5(value: string) {
  return crypto.createHash("md5").update(value).digest("hex");
}

export function generatePayHereHash({
  orderId,
  amount,
  currency,
}: {
  orderId: string;
  amount: number;
  currency: string;
}) {
  const formattedAmount = amount.toFixed(2);

  const hashedSecret = md5(merchantSecret!).toUpperCase();

  const hashString =
    merchantId + orderId + formattedAmount + currency + hashedSecret;

  return md5(hashString).toUpperCase();
}

export function verifyPayHereNotification({
  orderId,
  amount,
  currency,
  statusCode,
  md5sig,
}: {
  orderId: string;
  amount: string;
  currency: string;
  statusCode: string;
  md5sig: string;
}) {
  const hashedSecret = md5(merchantSecret!).toUpperCase();

  const hashString =
    merchantId + orderId + amount + currency + statusCode + hashedSecret;

  const localSignature = md5(hashString).toUpperCase();

  return localSignature === md5sig.toUpperCase();
}

export function getMerchantId() {
  return merchantId;
}
