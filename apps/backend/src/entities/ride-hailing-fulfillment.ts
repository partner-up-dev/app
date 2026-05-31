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
import type { FulfillmentLifecycleStatus } from "../domains/fulfillment/model";
import type { RideHailingProviderExecutionRef } from "../domains/fulfillment/model/ride-hailing-fulfillment";
import type { RideHailingProviderType } from "../domains/ride-hailing/model";
import {
  rideHailingProviderInstances,
  type RideHailingProviderInstanceId,
} from "./ride-hailing-provider";
import { tradeOrders, type TradeOrderId } from "./trade-order";

export type RideHailingFulfillmentId = string & {
  readonly __brand: "RideHailingFulfillmentId";
};

export const rideHailingFulfillments = pgTable(
  "ride_hailing_fulfillments",
  {
    id: uuid("id")
      .$type<RideHailingFulfillmentId>()
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
    providerInstanceId: uuid("provider_instance_id")
      .$type<RideHailingProviderInstanceId>()
      .notNull()
      .references(() => rideHailingProviderInstances.id, { onDelete: "restrict" }),
    providerType: text("provider_type")
      .$type<RideHailingProviderType>()
      .notNull(),
    externalOrderId: text("external_order_id"),
    providerOrderId: text("provider_order_id"),
    providerExecutionRef: jsonb("provider_execution_ref")
      .$type<RideHailingProviderExecutionRef | null>()
      .default(null),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orderUniqueIdx: uniqueIndex("ride_hailing_fulfillments_order_unique").on(
      table.orderId,
    ),
    providerInstanceIdx: index(
      "ride_hailing_fulfillments_provider_instance_idx",
    ).on(table.providerInstanceId),
    externalOrderUniqueIdx: uniqueIndex(
      "ride_hailing_fulfillments_external_order_unique",
    )
      .on(table.externalOrderId)
      .where(sql`${table.externalOrderId} is not null`),
    providerOrderUniqueIdx: uniqueIndex(
      "ride_hailing_fulfillments_provider_order_unique",
    )
      .on(table.providerType, table.providerOrderId)
      .where(sql`${table.providerOrderId} is not null`),
  }),
);

export type RideHailingFulfillment =
  typeof rideHailingFulfillments.$inferSelect;
export type NewRideHailingFulfillment =
  typeof rideHailingFulfillments.$inferInsert;
