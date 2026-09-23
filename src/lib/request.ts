/**
 * Best-effort client IP. Behind a proxy/CDN the left-most X-Forwarded-For entry
 * is the original client.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();

    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
