import {
  generatePayHereHash,
  getMerchantId,
  PAYHERE_CHECKOUT_URL,
} from "@/lib/payhere";
import { normalizePhone } from "@/lib/utils";

type BookingInfo = {
  id: string;
  orderId: string | null;
  totalPrice: unknown;
};

type CustomerInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    country: string;
  };
};

type FacilityInfo = {
  name: string;
  sports: {
    name: string;
  }[];
};

export function buildPayHerePayment({
  booking,
  customer,
  facility,
}: {
  booking: BookingInfo;
  customer: CustomerInfo;
  facility: FacilityInfo;
}) {
  if (!booking.orderId) {
    throw new Error("Booking orderId is missing");
  }

  const amount = Number(booking.totalPrice);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid booking amount");
  }

  const currency = "LKR";

  const hash = generatePayHereHash({
    orderId: booking.orderId,
    amount,
    currency,
  });

  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("APP_URL is not configured");
  }

  const address = customer.address.addressLine2
    ? `${customer.address.addressLine1}, ${customer.address.addressLine2}`
    : customer.address.addressLine1;

  return {
    action: PAYHERE_CHECKOUT_URL,
    fields: {
      merchant_id: getMerchantId(),
      return_url: `${appUrl}/player/payment/success?bookingId=${booking.id}`,
      cancel_url: `${appUrl}/player/payment/cancelled?bookingId=${booking.id}`,
      notify_url: `${appUrl}/api/payments/payhere/notify`,
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email,
      phone: normalizePhone(customer.phone),
      address,
      city: customer.address.city,
      country: customer.address.country,
      order_id: booking.orderId,
      items: `${facility.sports.map((s) => s.name).join(" / ")} - ${facility.name}`,
      currency,
      amount: amount.toFixed(2),
      hash,
    },
  };
}
