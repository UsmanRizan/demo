import { NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendSms } from "@/lib/textlk";

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.phone || typeof body.phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(body.phone);

    if (!/^94\d{9}$/.test(phone)) {
      return NextResponse.json(
        {
          error: "Enter a valid Sri Lankan phone number, e.g. +94771234567",
        },
        { status: 400 },
      );
    }

    // Remove older unverified OTPs for this phone.
    await prisma.otpCode.deleteMany({
      where: {
        phone,
        verified: false,
      },
    });

    const otp = generateOtp();
    const codeHash = hashOtp(otp);

    await prisma.otpCode.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const sms = await sendSms(
      phone,
      `Your BookMyPlay verification code is ${otp}. It expires in 5 minutes.`,
    );

    if (!sms.success) {
      return NextResponse.json(
        {
          error: "Unable to send OTP",
          details: sms.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
