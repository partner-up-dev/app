import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  RideHailingProviderInstanceConfig,
  RideHailingProviderInstanceStatus,
  RideHailingProviderType,
} from "../domains/ride-hailing/model";

export type RideHailingProviderInstanceId = string & {
  readonly __brand: "RideHailingProviderInstanceId";
};

export const rideHailingProviderInstances = pgTable(
  "ride_hailing_provider_instances",
  {
    id: uuid("id")
      .$type<RideHailingProviderInstanceId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerType: text("provider_type").$type<RideHailingProviderType>().notNull(),
    instanceKey: text("instance_key").notNull(),
    status: text("status").$type<RideHailingProviderInstanceStatus>().notNull().default("ACTIVE"),
    displayName: text("display_name").notNull(),
    config: jsonb("config").$type<RideHailingProviderInstanceConfig>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerTypeStatusIdx: index("ride_hailing_provider_instances_type_status_idx").on(
      table.providerType,
      table.status,
    ),
    providerInstanceUnique: uniqueIndex("ride_hailing_provider_instances_type_key_unique").on(
      table.providerType,
      table.instanceKey,
    ),
  }),
);

export type RideHailingProviderInstance = typeof rideHailingProviderInstances.$inferSelect;
export type NewRideHailingProviderInstance = typeof rideHailingProviderInstances.$inferInsert;
