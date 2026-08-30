import {
  pgTable,
  pgEnum,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  uniqueIndex,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("UserRole", [
  "PLAYER",
  "OWNER",
  "ADMIN",
  "STAFF",
]);

export const paymentStatusEnum = pgEnum("PaymentStatus", [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "CHARGEBACK",
]);

export const bookingStatusEnum = pgEnum("BookingStatus", [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);

export const withdrawalStatusEnum = pgEnum("WithdrawalStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const walletTransactionTypeEnum = pgEnum("WalletTransactionType", [
  "CREDIT",
  "DEBIT",
]);

// ─── Tables ─────────────────────────────────────────────────────────────────

export const users = pgTable(
  "User",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    phone: varchar("phone", { length: 255 }).unique().notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }),
    firstName: varchar("firstName", { length: 255 }),
    lastName: varchar("lastName", { length: 255 }),
    email: varchar("email", { length: 255 }),
    role: userRoleEnum("role").default("PLAYER").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("User_phone_idx").on(table.phone),
  ],
);

export const sports = pgTable(
  "Sport",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).unique().notNull(),
    slug: varchar("slug", { length: 255 }).unique().notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
);

export const locations = pgTable(
  "Location",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: varchar("ownerId", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    city: varchar("city", { length: 255 }).notNull(),
    description: varchar("description", { length: 1000 }),
    phone: varchar("phone", { length: 255 }),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("Location_ownerId_idx").on(table.ownerId),
    index("Location_city_idx").on(table.city),
  ],
);

export const facilities = pgTable(
  "Facility",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locationId: varchar("locationId", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 1000 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("Facility_locationId_idx").on(table.locationId),
  ],
);

export const availabilities = pgTable(
  "Availability",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locationId: varchar("locationId", { length: 255 }).notNull(),
    dayOfWeek: integer("dayOfWeek").notNull(),
    startTime: varchar("startTime", { length: 255 }).notNull(),
    endTime: varchar("endTime", { length: 255 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isTwentyFourHour: boolean("isTwentyFourHour").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    unique("Availability_locationId_dayOfWeek_key").on(
      table.locationId,
      table.dayOfWeek,
    ),
    index("Availability_locationId_idx").on(table.locationId),
  ],
);

export const blockedDates = pgTable(
  "BlockedDate",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locationId: varchar("locationId", { length: 255 }).notNull(),
    date: timestamp("date").notNull(),
    reason: varchar("reason", { length: 1000 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    unique("BlockedDate_locationId_date_key").on(table.locationId, table.date),
    index("BlockedDate_locationId_idx").on(table.locationId),
    index("BlockedDate_date_idx").on(table.date),
  ],
);

export const pricingRules = pgTable(
  "PricingRule",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locationId: varchar("locationId", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    startTime: varchar("startTime", { length: 255 }).notNull(),
    endTime: varchar("endTime", { length: 255 }).notNull(),
    percentage: decimal("percentage", { precision: 10, scale: 2 }).notNull(),
    dayOfWeek: integer("dayOfWeek"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("PricingRule_locationId_idx").on(table.locationId),
  ],
);

export const bookings = pgTable(
  "Booking",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    playerId: varchar("playerId", { length: 255 }).notNull(),
    facilityId: varchar("facilityId", { length: 255 }).notNull(),
    startAt: timestamp("startAt").notNull(),
    endAt: timestamp("endAt").notNull(),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    status: bookingStatusEnum("status").default("PENDING").notNull(),
    paymentStatus: paymentStatusEnum("paymentStatus").default("PENDING").notNull(),
    paymentId: varchar("paymentId", { length: 255 }),
    paymentMethod: varchar("paymentMethod", { length: 255 }),
    orderId: varchar("orderId", { length: 255 }).unique(),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("Booking_playerId_idx").on(table.playerId),
    index("Booking_facilityId_idx").on(table.facilityId),
    index("Booking_startAt_endAt_idx").on(table.startAt, table.endAt),
    index("Booking_status_idx").on(table.status),
    index("Booking_paymentStatus_idx").on(table.paymentStatus),
    index("Booking_expiresAt_idx").on(table.expiresAt),
  ],
);

export const otpCodes = pgTable(
  "OtpCode",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    phone: varchar("phone", { length: 255 }).notNull(),
    codeHash: varchar("codeHash", { length: 255 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    verified: boolean("verified").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("OtpCode_phone_idx").on(table.phone),
    index("OtpCode_expiresAt_idx").on(table.expiresAt),
  ],
);

export const userAddresses = pgTable(
  "UserAddress",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 255 }).unique().notNull(),
    addressLine1: varchar("addressLine1", { length: 255 }).notNull(),
    addressLine2: varchar("addressLine2", { length: 255 }),
    city: varchar("city", { length: 255 }).notNull(),
    country: varchar("country", { length: 255 }).default("Sri Lanka").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
);

export const wallets = pgTable(
  "Wallet",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: varchar("userId", { length: 255 }).unique().notNull(),
    balance: decimal("balance", { precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
);

export const withdrawalRequests = pgTable(
  "WithdrawalRequest",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ownerId: varchar("ownerId", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    bankName: varchar("bankName", { length: 255 }).notNull(),
    accountNumber: varchar("accountNumber", { length: 255 }).notNull(),
    accountHolderName: varchar("accountHolderName", { length: 255 }).notNull(),
    status: withdrawalStatusEnum("status").default("PENDING").notNull(),
    adminNote: varchar("adminNote", { length: 1000 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("WithdrawalRequest_ownerId_idx").on(table.ownerId),
    index("WithdrawalRequest_status_idx").on(table.status),
  ],
);

export const locationStaff = pgTable(
  "LocationStaff",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    locationId: varchar("locationId", { length: 255 }).notNull(),
    staffId: varchar("staffId", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    unique("LocationStaff_locationId_staffId_key").on(
      table.locationId,
      table.staffId,
    ),
    index("LocationStaff_locationId_idx").on(table.locationId),
    index("LocationStaff_staffId_idx").on(table.staffId),
  ],
);

export const walletTransactions = pgTable(
  "WalletTransaction",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    walletId: varchar("walletId", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    type: walletTransactionTypeEnum("type").notNull(),
    bookingId: varchar("bookingId", { length: 255 }),
    note: varchar("note", { length: 1000 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("WalletTransaction_walletId_idx").on(table.walletId),
  ],
);

// ─── Many-to-many junction table (Facility ↔ Sport) ────────────────────────

export const facilityToSport = pgTable(
  "_FacilityToSport",
  {
    a: varchar("A", { length: 255 }).notNull(),
    b: varchar("B", { length: 255 }).notNull(),
  },
  (table) => [
    unique("_FacilityToSport_AB_unique").on(table.a, table.b),
    index("_FacilityToSport_B_index").on(table.b),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const userRelations = relations(users, ({ one, many }) => ({
  locations: many(locations),
  bookings: many(bookings),
  address: one(userAddresses, {
    fields: [users.id],
    references: [userAddresses.userId],
  }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  withdrawalRequests: many(withdrawalRequests),
  staffLocations: many(locationStaff),
}));

export const sportRelations = relations(sports, ({ many }) => ({
  facilitiesToSport: many(facilityToSport),
}));

export const locationRelations = relations(locations, ({ one, many }) => ({
  owner: one(users, {
    fields: [locations.ownerId],
    references: [users.id],
  }),
  facilities: many(facilities),
  availabilities: many(availabilities),
  blockedDates: many(blockedDates),
  pricingRules: many(pricingRules),
  staff: many(locationStaff),
}));

export const facilityRelations = relations(facilities, ({ one, many }) => ({
  location: one(locations, {
    fields: [facilities.locationId],
    references: [locations.id],
  }),
  sports: many(facilityToSport),
  bookings: many(bookings),
}));

export const availabilityRelations = relations(availabilities, ({ one }) => ({
  location: one(locations, {
    fields: [availabilities.locationId],
    references: [locations.id],
  }),
}));

export const blockedDateRelations = relations(blockedDates, ({ one }) => ({
  location: one(locations, {
    fields: [blockedDates.locationId],
    references: [locations.id],
  }),
}));

export const pricingRuleRelations = relations(pricingRules, ({ one }) => ({
  location: one(locations, {
    fields: [pricingRules.locationId],
    references: [locations.id],
  }),
}));

export const bookingRelations = relations(bookings, ({ one }) => ({
  player: one(users, {
    fields: [bookings.playerId],
    references: [users.id],
  }),
  facility: one(facilities, {
    fields: [bookings.facilityId],
    references: [facilities.id],
  }),
}));

export const otpCodeRelations = relations(otpCodes, () => ({}));

export const userAddressRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id],
  }),
}));

export const walletRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
}));

export const withdrawalRequestRelations = relations(
  withdrawalRequests,
  ({ one }) => ({
    owner: one(users, {
      fields: [withdrawalRequests.ownerId],
      references: [users.id],
    }),
  }),
);

export const locationStaffRelations = relations(locationStaff, ({ one }) => ({
  location: one(locations, {
    fields: [locationStaff.locationId],
    references: [locations.id],
  }),
  staff: one(users, {
    fields: [locationStaff.staffId],
    references: [users.id],
  }),
}));

export const walletTransactionRelations = relations(
  walletTransactions,
  ({ one }) => ({
    wallet: one(wallets, {
      fields: [walletTransactions.walletId],
      references: [wallets.id],
    }),
  }),
);

// ─── Many-to-many relations (Facility ↔ Sport) ────────────────────────────

export const facilityToSportRelations = relations(facilityToSport, ({ one }) => ({
  facility: one(facilities, {
    fields: [facilityToSport.a],
    references: [facilities.id],
  }),
  sport: one(sports, {
    fields: [facilityToSport.b],
    references: [sports.id],
  }),
}));
