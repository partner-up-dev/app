import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  RentalBookingStatus,
  RentalCancellationHandlingStatus,
  RentalEntryGuidance,
  RentalRegistrant,
  RentalSupplierCancellationOutcome,
} from "../domains/trade/model";
import { tradeOrders, type TradeOrderId } from "./trade-order";

export const rentalOrders = pgTable(
  "rental_orders",
  {
    orderId: uuid("order_id")
      .$type<TradeOrderId>()
      .primaryKey()
      .references(() => tradeOrders.id, { onDelete: "cascade" }),
    serviceStartAt: timestamp("service_start_at", { withTimezone: true }).notNull(),
    serviceEndAt: timestamp("service_end_at", { withTimezone: true }).notNull(),
    contactPhone: text("contact_phone").notNull(),
    registrants: jsonb("registrants")
      .$type<RentalRegistrant[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
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
    entryGuidance: jsonb("entry_guidance").$type<RentalEntryGuidance | null>().default(null),
    bookingNote: text("booking_note"),
    cancellationNote: text("cancellation_note"),
    serviceEndedAt: timestamp("service_ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    serviceStartIdx: index("rental_orders_service_start_idx").on(table.serviceStartAt),
  }),
);

export type RentalOrder = typeof rentalOrders.$inferSelect;
export type NewRentalOrder = typeof rentalOrders.$inferInsert;
