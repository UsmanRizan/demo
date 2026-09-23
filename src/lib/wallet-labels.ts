// Client-safe labels for wallet ledger categories.
export const CATEGORY_LABELS: Record<string, string> = {
  BOOKING_PAYMENT: "Booking payment",
  BOOKING_REFUND: "Booking refund",
  BOOKING_EARNING: "Booking earning",
  EARNING_REVERSAL: "Earning reversed (booking cancelled)",
  WITHDRAWAL: "Withdrawal",
  WITHDRAWAL_REVERSAL: "Withdrawal returned",
  ADJUSTMENT: "Adjustment",
};

export function categoryLabel(category: string | null | undefined): string {
  return (category && CATEGORY_LABELS[category]) || "Transaction";
}
