import { after, NextResponse } from "next/server";

import { logError } from "@/lib/monitoring";
import { notifyAddress } from "@/lib/notifications";
import { enforceRateLimits } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { contactSchema, parseJson } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const limited = await enforceRateLimits(
      [{ key: `contact:ip:${getClientIp(request)}`, limit: 5, windowSeconds: 3600 }],
      "You've sent several messages recently. Please try again later.",
    );

    if (limited) {
      return limited;
    }

    const parsed = await parseJson(request, contactSchema);

    if (parsed.response) {
      return parsed.response;
    }

    const { name, email, phone, reason, message } = parsed.data;

    console.info("[contact] new message", {
      name,
      email,
      reason,
      at: new Date().toISOString(),
    });

    const supportEmail = process.env.SUPPORT_EMAIL;

    if (supportEmail) {
      after(() =>
        notifyAddress(
          { email: supportEmail },
          {
            type: "CONTACT_FORM",
            email: {
              subject: `[Contact] ${reason || "General"} - ${name}`,
              text: `From: ${name} <${email}>\nPhone: ${phone || "-"}\nReason: ${reason || "-"}\n\n${message}`,
            },
          },
        ),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("Contact form error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
