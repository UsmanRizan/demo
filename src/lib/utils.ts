/**
 * Shared utility functions used across multiple API routes.
 */

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Convert Sri Lankan local format (0xxxxxxxxx) to international (94xxxxxxxxx)
  if (digits.startsWith("0") && digits.length === 10) {
    return "94" + digits.slice(1);
  }
  return digits;
}

export function isValidSriLankanPhone(phone: string): boolean {
  return /^94\d{9}$/.test(normalizePhone(phone));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function createLocalDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:30`);
}
