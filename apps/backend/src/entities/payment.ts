import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type {
  PaymentProviderInstanceConfig,
  PaymentProviderInstanceStatus,
  PaymentProviderType,
} from "../domains/payment/model";

export type PaymentProviderInstanceId = string & {
  readonly __brand: "PaymentProviderInstanceId";
};

export const paymentProviderInstances = pgTable(
  "payment_provider_instances",
  {
    id: uuid("id").$type<PaymentProviderInstanceId>().primaryKey().default(sql`gen_random_uuid()`),
    providerType: text("provider_type").$type<PaymentProviderType>().notNull(),
    instanceKey: text("instance_key").notNull(),
    status: text("status").$type<PaymentProviderInstanceStatus>().notNull().default("ACTIVE"),
    displayName: text("display_name").notNull(),
    clientId: text("client_id").notNull(),
    config: jsonb("config").$type<PaymentProviderInstanceConfig>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerTypeStatusIdx: index("payment_provider_instances_type_status_idx").on(
      table.providerType,
      table.status,
    ),
    providerInstanceUnique: uniqueIndex("payment_provider_instances_type_key_unique").on(
      table.providerType,
      table.instanceKey,
    ),
  }),
);

export type PaymentProviderInstance = typeof paymentProviderInstances.$inferSelect;
export type NewPaymentProviderInstance = typeof paymentProviderInstances.$inferInsert;
