/**
 * Client helper for owner actions that may affect existing bookings (blocking
 * a date, closing a location or court). If the server replies 409 HAS_BOOKINGS,
 * the owner is asked to confirm and the request is retried with
 * cancelExistingBookings: true.
 */
export async function requestWithClosureConfirm(
  url: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data: Record<string, unknown>; aborted?: boolean }> {
  const send = async (payload: Record<string, unknown>) => {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    return { response, data };
  };

  const first = await send(body);

  if (first.response.status === 409 && first.data.code === "HAS_BOOKINGS") {
    if (!window.confirm(String(first.data.error))) {
      return { ok: false, data: first.data, aborted: true };
    }

    const second = await send({ ...body, cancelExistingBookings: true });

    return { ok: second.response.ok, data: second.data };
  }

  return { ok: first.response.ok, data: first.data };
}
