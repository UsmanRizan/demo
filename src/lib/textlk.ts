type SendSmsResult = {
  success: boolean;
  message?: string;
  data?: unknown;
};

export async function sendSms(
  recipient: string,
  message: string,
): Promise<SendSmsResult> {
  const apiToken = process.env.TEXTLK_API_TOKEN;
  const senderId = process.env.TEXTLK_SENDER_ID;

  if (!apiToken) {
    throw new Error("TEXTLK_API_TOKEN is not configured");
  }

  if (!senderId) {
    throw new Error("TEXTLK_SENDER_ID is not configured");
  }

  const response = await fetch("https://app.text.lk/api/v3/sms/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      recipient,
      sender_id: senderId,
      type: "plain",
      message,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.status !== "success") {
    console.error("Text.lk error:", data);

    return {
      success: false,
      message: data.message || "Failed to send SMS",
      data,
    };
  }

  return {
    success: true,
    message: data.message,
    data: data.data,
  };
}
