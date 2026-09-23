import { NextResponse } from "next/server";

import { logError } from "@/lib/monitoring";
import { generateOtp, hashOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { enforceRateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { sendSms } from "@/lib/textlk";
import { parseJson, sendOtpSchema } from "@/lib/validation";

const OTP_TTL_MINUTES = 5;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // Checked before parsing so malformed floods are limited too.
    const ipLimited = await enforceRateLimits(
      [{ key: `send-otp:ip:${ip}`, limit: 20, windowSeconds: 3600 }],
      "Too many verification codes requested from this network. Please try again later.",
    );

    if (ipLimited) {
      return ipLimited;
    }

    const parsed = await parseJson(request, sendOtpSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { phone } = parsed.data;

    // Every SMS costs money: at most 1 per minute and 5 per hour per number.
    const phoneLimited = await enforceRateLimits(
      [
        { key: `send-otp:phone-1m:${phone}`, limit: 1, windowSeconds: 60 },
        { key: `send-otp:phone-1h:${phone}`, limit: 5, windowSeconds: 3600 },
      ],
      "Please wait before requesting another code.",
    );

    if (phoneLimited) {
      return phoneLimited;
    }

    // Remove older unverified OTPs for this phone.
    await prisma.otpCode.deleteMany({
      where: { phone, verified: false },
    });

    const otp = generateOtp();

    await prisma.otpCode.create({
      data: {
        phone,
        codeHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    const message = `Your BookMyPlay verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`;

    if (process.env.OTP_DEV_LOG === "true" && process.env.NODE_ENV !== "production") {
      // Local development only: print instead of sending a paid SMS.
      console.info(`[dev] OTP for ${phone}: ${otp}`);
    } else {
      const sms = await sendSms(phone, message);

      if (!sms.success) {
        logError("OTP SMS failed", { phone, message: sms.message });

        return NextResponse.json({ error: "Unable to send OTP" }, { status: 502 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    logError("Send OTP error:", error);

    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
