type SendEmailResult =
  | { success: true; id?: string }
  | { success: false; skipped?: boolean; message: string };

/**
 * Sends email through Resend's HTTP API when RESEND_API_KEY and EMAIL_FROM are
 * configured. Without them, email is skipped (SMS remains the primary channel).
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { success: false, skipped: true, message: "Email is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };

  if (!response.ok) {
    return { success: false, message: data.message || `Email failed (${response.status})` };
  }

  return { success: true, id: data.id };
}
