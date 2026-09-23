import { NextResponse } from "next/server";
import { z } from "zod";

import { isValidDate, normalizePhone } from "@/lib/utils";

/**
 * Parse and validate a JSON request body. Returns either the typed data or a
 * ready-to-return 400 response with the first validation message.
 */
export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<
  { data: z.infer<T>; response?: never } | { data?: never; response: NextResponse }
> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    const issue = result.error.issues[0];

    return {
      response: NextResponse.json(
        {
          error: issue?.message ?? "Invalid request.",
          field: issue?.path.join(".") || undefined,
        },
        { status: 400 },
      ),
    };
  }

  return { data: result.data };
}

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

const trimmed = (message: string) => z.string({ error: message }).trim();

export const phoneSchema = z
  .string({ error: "Phone number is required" })
  .transform((value) => normalizePhone(value))
  .refine((value) => /^94\d{9}$/.test(value), {
    message: "Enter a valid Sri Lankan phone number, e.g. +94771234567",
  });

export const dateSchema = z
  .string({ error: "Date is required" })
  .refine(isValidDate, { message: "Date must be a valid YYYY-MM-DD date" });

export const timeSchema = z
  .string({ error: "Time is required" })
  .regex(/^([01]\d|2[0-4]):[0-5]\d$/, "Time must be in HH:MM format");

export const idSchema = z.string({ error: "id is required" }).min(1).max(64);

export const passwordSchema = z
  .string({ error: "Password is required" })
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
  );

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

export const sendOtpSchema = z.object({ phone: phoneSchema });

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z
    .string({ error: "OTP is required" })
    .trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export const setPasswordSchema = z.object({ password: passwordSchema });

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: "Current password is required" })
    .min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const bookingRequestSchema = z.object({
  facilityId: idSchema,
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  repeatWeeks: z.coerce
    .number()
    .int()
    .min(1, "repeatWeeks must be between 1 and 12")
    .max(12, "repeatWeeks must be between 1 and 12")
    .optional()
    .default(1),
});

export const bookingIdSchema = z.object({ bookingId: idSchema });

export const cancelBookingSchema = z.object({
  bookingId: idSchema,
  reason: z.string().trim().max(300).optional(),
});

export const ownerBookingActionSchema = z.object({
  action: z.enum(["confirm", "complete", "cancel"], {
    error: "Invalid action. Use confirm, complete, or cancel.",
  }),
  reason: z.string().trim().max(300).optional(),
});

export const withdrawalRequestSchema = z.object({
  amount: z
    .number({ error: "A valid withdrawal amount is required." })
    .positive("A valid withdrawal amount is required.")
    .min(100, "Minimum withdrawal amount is Rs. 100.00.")
    .max(10_000_000, "Amount is too large."),
  bankName: trimmed("Bank name is required.").min(1, "Bank name is required.").max(100),
  accountNumber: trimmed("Account number is required.")
    .min(4, "Account number is required.")
    .max(34, "Account number is too long.")
    .regex(/^[0-9A-Za-z\- ]+$/, "Account number contains invalid characters."),
  accountHolderName: trimmed("Account holder name is required.")
    .min(1, "Account holder name is required.")
    .max(100),
});

export const withdrawalActionSchema = z.object({
  action: z.enum(["approve", "reject"], {
    error: "Action must be 'approve' or 'reject'.",
  }),
  adminNote: z.string().trim().max(500).optional(),
});

export const roleChangeSchema = z.object({
  role: z.enum(["PLAYER", "OWNER"], { error: "Invalid role" }),
});

export const sportSchema = z.object({
  name: trimmed("Sport name is required").min(1, "Sport name is required").max(60),
});

export const sportUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
});

export const profileSchema = z.object({
  firstName: trimmed("First name is required.").min(1, "First name is required.").max(60),
  lastName: trimmed("Last name is required.").min(1, "Last name is required.").max(60),
  email: z
    .string({ error: "Email is required." })
    .trim()
    .toLowerCase()
    .pipe(z.email("Please enter a valid email address.")),
  addressLine1: trimmed("Address is required.").min(1, "Address is required.").max(200),
  addressLine2: z.string().trim().max(200).optional().default(""),
  city: trimmed("City is required.").min(1, "City is required.").max(100),
  country: z.string().trim().min(1).max(100).optional().default("Sri Lanka"),
});

export const contactSchema = z.object({
  name: trimmed("Please provide your name.").min(2, "Please provide your name.").max(100),
  email: z
    .string({ error: "Please provide a valid email." })
    .trim()
    .pipe(z.email("Please provide a valid email.")),
  phone: z.string().trim().max(30).optional().default(""),
  reason: z.string().trim().max(100).optional().default(""),
  message: trimmed("Please add a short message.")
    .min(5, "Please add a short message.")
    .max(5000, "Message is too long."),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

// null/empty must fail rather than coerce to 0 (which is a valid coordinate).
const coordinate = (limit: number) =>
  z.preprocess(
    (value) =>
      value === null || value === undefined || value === "" ? undefined : Number(value),
    z
      .number({ error: "Please select the location on the map" })
      .min(-limit, "Invalid map coordinates")
      .max(limit, "Invalid map coordinates"),
  );

export const locationCreateSchema = z.object({
  name: trimmed("Name is required").min(1, "Name, address and city are required").max(120),
  address: trimmed("Address is required").min(1, "Name, address and city are required").max(250),
  city: trimmed("City is required").min(1, "Name, address and city are required").max(100),
  description: optionalText(2000),
  phone: optionalText(30),
  latitude: coordinate(90),
  longitude: coordinate(180),
});

export const locationUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: optionalText(2000).optional(),
  phone: optionalText(30).optional(),
  isActive: z.boolean().optional(),
  cancelExistingBookings: z.boolean().optional(),
  reason: z.string().trim().max(300).optional(),
});

const priceSchema = z.coerce
  .number({ error: "Price must be greater than zero" })
  .positive("Price must be greater than zero")
  .max(1_000_000, "Price is too large");

const sportIdsSchema = z
  .array(z.string().min(1))
  .min(1, "At least one sport is required");

export const facilityCreateSchema = z.object({
  locationId: idSchema,
  sportIds: sportIdsSchema,
  name: trimmed("Facility name is required").min(1, "Facility name is required").max(120),
  description: optionalText(2000),
  imageUrl: z
    .url()
    .nullish()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  price: priceSchema,
});

export const facilityUpdateSchema = z.object({
  price: priceSchema.optional(),
  sportIds: sportIdsSchema.optional(),
  isActive: z.boolean().optional(),
  cancelExistingBookings: z.boolean().optional(),
  reason: z.string().trim().max(300).optional(),
});

export const blockDateSchema = z.object({
  date: z
    .string({ error: "date is required (YYYY-MM-DD)" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
    .refine(isValidDate, "date must be a valid date"),
  reason: z.string().trim().max(200).nullish(),
  cancelExistingBookings: z.boolean().optional(),
});

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Times must use HH:MM format");

export const availabilitySchema = z.object({
  availability: z
    .array(
      z
        .object({
          dayOfWeek: z
            .number({ error: "dayOfWeek must be between 0 and 6" })
            .int("dayOfWeek must be between 0 and 6")
            .min(0, "dayOfWeek must be between 0 and 6")
            .max(6, "dayOfWeek must be between 0 and 6"),
          startTime: hhmm.optional(),
          endTime: hhmm.optional(),
          isActive: z.boolean().optional(),
          isTwentyFourHour: z.boolean().optional(),
        })
        .refine(
          (entry) =>
            entry.isTwentyFourHour === true ||
            (!!entry.startTime && !!entry.endTime),
          { message: "startTime and endTime are required" },
        )
        .refine(
          (entry) =>
            entry.isTwentyFourHour === true ||
            (entry.startTime ?? "") < (entry.endTime ?? ""),
          { message: "Start time must be before end time" },
        ),
      { error: "availability must be an array" },
    )
    .max(7)
    .refine(
      (entries) => new Set(entries.map((e) => e.dayOfWeek)).size === entries.length,
      { message: "A day cannot be added more than once" },
    ),
});

export const pricingRulesSchema = z.object({
  rules: z
    .array(
      z.object({
        name: z.string().trim().max(60).nullish(),
        startTime: hhmm,
        endTime: hhmm,
        percentage: z
          .number({ error: "percentage must be a valid number" })
          .min(-50, "percentage must be between -50 and 100")
          .max(100, "percentage must be between -50 and 100"),
        dayOfWeek: z.number().int().min(0).max(6).nullish(),
        isActive: z.boolean().optional(),
      }),
      { error: "rules must be an array" },
    )
    .max(50),
});

export const staffCreateSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export const staffRemoveSchema = z.object({ staffId: idSchema });

export const reviewSchema = z.object({
  bookingId: idSchema,
  rating: z.number().int().min(1, "Rating must be 1-5").max(5, "Rating must be 1-5"),
  comment: z.string().trim().max(1000, "Comment is too long").optional(),
});

export const reviewReplySchema = z.object({
  reply: z.string().trim().max(1000, "Reply is too long"),
});

export const imageAttachSchema = z.object({
  url: z.url("A valid image URL is required"),
  publicId: z.string().max(200).nullish(),
});

export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", { error: 'Type "DELETE" to confirm.' }),
  forfeitWalletBalance: z.boolean().optional(),
});
