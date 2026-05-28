import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  FulfillmentLifecycleStatus,
  RentalBookingStatus,
  RentalCancellationHandlingStatus,
  RentalSupplierCancellationOutcome,
} from "../domains/fulfillment";
import { tradeOrders, type TradeOrderId } from "./trade-order";

export type RentalFulfillmentId = string & { readonly __brand: "RentalFulfillmentId" };

export type RentalEntryGuidance = {
  entryByPhone?: string | null;
  entryByRealName?: string | null;
  note?: string | null;
};

export const rentalFulfillments = pgTable(
  "rental_fulfillments",
  {
    id: uuid("id")
      .$type<RentalFulfillmentId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .$type<TradeOrderId>()
      .notNull()
      .references(() => tradeOrders.id, { onDelete: "cascade" }),
    lifecycleStatus: text("lifecycle_status")
      .$type<FulfillmentLifecycleStatus>()
      .notNull()
      .default("PENDING"),
    bookingStatus: text("booking_status")
      .$type<RentalBookingStatus>()
      .notNull()
      .default("PENDING_BOOKING"),
    cancellationHandlingStatus: text("cancellation_handling_status")
      .$type<RentalCancellationHandlingStatus>()
      .notNull()
      .default("NONE"),
    supplierCancellationOutcome: text("supplier_cancellation_outcome")
      .$type<RentalSupplierCancellationOutcome | null>()
      .default(null),
    entryGuidance: jsonb("entry_guidance")
      .$type<RentalEntryGuidance | null>()
      .default(null),
    bookingNote: text("booking_note"),
    cancellationNote: text("cancellation_note"),
    irreversibleBoundaryAt: timestamp("irreversible_boundary_at", {
      withTimezone: true,
    }),
    serviceEndedAt: timestamp("service_ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderUniqueIdx: uniqueIndex("rental_fulfillments_order_unique").on(
      table.orderId,
    ),
    lifecycleBookingIdx: index("rental_fulfillments_lifecycle_booking_idx").on(
      table.lifecycleStatus,
      table.bookingStatus,
    ),
  }),
);

export type RentalFulfillment = typeof rentalFulfillments.$inferSelect;
export type NewRentalFulfillment = typeof rentalFulfillments.$inferInsert;
