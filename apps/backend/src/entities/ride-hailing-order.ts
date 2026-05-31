import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  RideHailingProviderCreationStatus,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
} from "../domains/trade/model";
import { tradeOrders, type TradeOrderId } from "./trade-order";

export const rideHailingOrders = pgTable(
  "ride_hailing_orders",
  {
    orderId: uuid("order_id")
      .$type<TradeOrderId>()
      .primaryKey()
      .references(() => tradeOrders.id, { onDelete: "cascade" }),
    routeSnapshot: jsonb("route_snapshot")
      .$type<RideHailingRouteSnapshot>()
      .notNull(),
    departureAt: timestamp("departure_at", { withTimezone: true }),
    riders: jsonb("riders")
      .$type<RideHailingRiderSnapshot[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    contactPhone: text("contact_phone").notNull(),
    providerCreationStatus: text("provider_creation_status")
      .$type<RideHailingProviderCreationStatus>()
      .notNull()
      .default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    departureAtIdx: index("ride_hailing_orders_departure_at_idx").on(
      table.departureAt,
    ),
    providerCreationStatusIdx: index(
      "ride_hailing_orders_provider_creation_status_idx",
    ).on(table.providerCreationStatus),
  }),
);

export type RideHailingOrder = typeof rideHailingOrders.$inferSelect;
export type NewRideHailingOrder = typeof rideHailingOrders.$inferInsert;
