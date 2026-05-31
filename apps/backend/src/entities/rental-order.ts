import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { RentalRegistrant } from "../domains/trade/model";
import { tradeOrders, type TradeOrderId } from "./trade-order";

export const rentalOrders = pgTable(
  "rental_orders",
  {
    orderId: uuid("order_id")
      .$type<TradeOrderId>()
      .primaryKey()
      .references(() => tradeOrders.id, { onDelete: "cascade" }),
    selectedZoneCodes: text("selected_zone_codes")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    serviceStartAt: timestamp("service_start_at", { withTimezone: true })
      .notNull(),
    serviceEndAt: timestamp("service_end_at", { withTimezone: true }).notNull(),
    participantCount: integer("participant_count").notNull(),
    contactPhone: text("contact_phone").notNull(),
    registrants: jsonb("registrants")
      .$type<RentalRegistrant[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    serviceStartIdx: index("rental_orders_service_start_idx").on(
      table.serviceStartAt,
    ),
  }),
);

export type RentalOrder = typeof rentalOrders.$inferSelect;
export type NewRentalOrder = typeof rentalOrders.$inferInsert;
