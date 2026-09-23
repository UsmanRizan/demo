import crypto from "node:crypto";

import { hashOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

export const BASE_URL = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

export const TEST_OTP = "246810";

/** Every phone number the tests generated, for exact cleanup. */
export const usedPhones = new Set<string>();

/** Unique Sri Lankan-format test number (94 70 xxxxxxx). */
export function testPhone(): string {
  const phone = `9470${crypto.randomInt(1_000_000, 9_999_999)}`;
  usedPhones.add(phone);
  return phone;
}

/** Random client IP so each test client gets its own IP rate-limit bucket. */
export function testIp(): string {
  return `10.${crypto.randomInt(0, 255)}.${crypto.randomInt(0, 255)}.${crypto.randomInt(1, 254)}`;
}

/** Colombo calendar date `days` from today, YYYY-MM-DD. */
export function colomboDate(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(
    new Date(Date.now() + days * 86_400_000),
  );
}

export function hour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export type ApiResponse<T = Record<string, unknown>> = {
  status: number;
  data: T;
  text: string;
  headers: Headers;
};

export class Client {
  cookie: string | null = null;
  readonly ip = testIp();

  constructor(public phone: string = testPhone()) {}

  async request<T = Record<string, unknown>>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      "x-forwarded-for": this.ip,
      ...extraHeaders,
    };

    if (this.cookie) headers.cookie = this.cookie;
    if (body !== undefined && !(body instanceof URLSearchParams)) {
      headers["content-type"] = "application/json";
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : body instanceof URLSearchParams
            ? body
            : JSON.stringify(body),
      redirect: "manual",
    });

    for (const setCookie of response.headers.getSetCookie()) {
      const [pair] = setCookie.split(";");
      if (pair.startsWith("session=")) {
        this.cookie = pair === "session=" ? null : pair;
      }
    }

    const text = await response.text();
    let data: unknown = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    return { status: response.status, data: data as T, text, headers: response.headers };
  }

  get<T = Record<string, unknown>>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T = Record<string, unknown>>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body ?? {});
  }

  patch<T = Record<string, unknown>>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body ?? {});
  }

  put<T = Record<string, unknown>>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body ?? {});
  }

  delete<T = Record<string, unknown>>(path: string, body?: unknown) {
    return this.request<T>("DELETE", path, body);
  }

  /** Sign in through the real OTP verification endpoint. */
  async signIn(): Promise<this> {
    await prisma.otpCode.create({
      data: {
        phone: this.phone,
        codeHash: hashOtp(TEST_OTP),
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });

    const response = await this.post("/api/auth/verify-otp", {
      phone: this.phone,
      code: TEST_OTP,
    });

    if (response.status !== 200 || !this.cookie) {
      throw new Error(`Sign-in failed for ${this.phone}: ${response.status} ${response.text}`);
    }

    return this;
  }
}

/** PayHere server-to-server notification with a valid (or forged) signature. */
export function payhereNotification({
  orderId,
  amount,
  statusCode,
  forge = false,
}: {
  orderId: string;
  amount: string;
  statusCode: string;
  forge?: boolean;
}): URLSearchParams {
  const merchantId = process.env.PAYHERE_MERCHANT_ID ?? "";
  const md5 = (value: string) => crypto.createHash("md5").update(value).digest("hex");
  const secretHash = md5(process.env.PAYHERE_MERCHANT_SECRET ?? "").toUpperCase();
  const signature = md5(`${merchantId}${orderId}${amount}LKR${statusCode}${secretHash}`).toUpperCase();

  return new URLSearchParams({
    merchant_id: merchantId,
    order_id: orderId,
    payment_id: `PH-${crypto.randomInt(1e8, 9e8)}`,
    payhere_amount: amount,
    payhere_currency: "LKR",
    status_code: statusCode,
    md5sig: forge ? "0".repeat(32) : signature,
    method: "VISA",
  });
}

export async function walletBalance(userId: string): Promise<number> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet ? Number(wallet.balance) : 0;
}

export async function ledger(userId: string, bookingId?: string) {
  return prisma.walletTransaction.findMany({
    where: { wallet: { userId }, ...(bookingId ? { bookingId } : {}) },
    orderBy: { createdAt: "asc" },
  });
}
