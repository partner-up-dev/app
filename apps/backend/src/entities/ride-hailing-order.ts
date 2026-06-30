import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  RideHailingDriverSnapshot,
  RideHailingDispatchBindingSnapshot,
  RideHailingExecutionPhase,
  RideHailingFinalSettlementInput,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  RideHailingVehicleSnapshot,
} from "../domains/trade/model";
import { tradeOrders, type TradeOrderId } from "./trade-order";

export const rideHailingOrders = pgTable(
  "ride_hailing_orders",
  {
    orderId: uuid("order_id")
      .$type<TradeOrderId>()
      .primaryKey()
      .references(() => tradeOrders.id, { onDelete: "cascade" }),
    routeSnapshot: jsonb("route_snapshot").$type<RideHailingRouteSnapshot>().notNull(),
    departureAt: timestamp("departure_at", { withTimezone: true }),
    riders: jsonb("riders").$type<RideHailingRiderSnapshot[]>().notNull().default(sql`'[]'::jsonb`),
    contactPhone: text("contact_phone").notNull(),
    executionPhase: text("execution_phase")
      .$type<RideHailingExecutionPhase>()
      .notNull()
      .default("INITIATING"),
    driverSnapshot: jsonb("driver_snapshot")
      .$type<RideHailingDriverSnapshot | null>()
      .default(null),
    vehicleSnapshot: jsonb("vehicle_snapshot")
      .$type<RideHailingVehicleSnapshot | null>()
      .default(null),
    dispatchBinding: jsonb("dispatch_binding")
      .$type<RideHailingDispatchBindingSnapshot | null>()
      .default(null),
    finalSettlementInput: jsonb("final_settlement_input")
      .$type<RideHailingFinalSettlementInput | null>()
      .default(null),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    departureAtIdx: index("ride_hailing_orders_departure_at_idx").on(table.departureAt),
    executionPhaseIdx: index("ride_hailing_orders_execution_phase_idx").on(table.executionPhase),
  }),
);

export type RideHailingOrder = typeof rideHailingOrders.$inferSelect;
export type NewRideHailingOrder = typeof rideHailingOrders.$inferInsert;
