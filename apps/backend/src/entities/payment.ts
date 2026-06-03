import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { BillLineId } from "./bill";
import { billLines } from "./bill";
import type {
  PaymentProviderInstanceConfig,
  PaymentProviderInstanceStatus,
  PaymentProviderType,
  PaymentTxType,
  PaymentTxStatus,
} from "../domains/payment/model";
import { users, type UserId } from "./user";

export type PaymentProviderInstanceId = string & {
  readonly __brand: "PaymentProviderInstanceId";
};
export type PaymentTxId = string & { readonly __brand: "PaymentTxId" };

export const paymentProviderInstances = pgTable(
  "payment_provider_instances",
  {
    id: uuid("id")
      .$type<PaymentProviderInstanceId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerType: text("provider_type").$type<PaymentProviderType>().notNull(),
    instanceKey: text("instance_key").notNull(),
    status: text("status")
      .$type<PaymentProviderInstanceStatus>()
      .notNull()
      .default("ACTIVE"),
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
    providerInstanceUnique: uniqueIndex(
      "payment_provider_instances_type_key_unique",
    ).on(table.providerType, table.instanceKey),
    activeClientUnique: uniqueIndex(
      "payment_provider_instances_active_client_unique",
    )
      .on(table.clientId)
      .where(sql`${table.status} = 'ACTIVE'`),
  }),
);

export const paymentTxs = pgTable(
  "payment_txs",
  {
    id: uuid("id")
      .$type<PaymentTxId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    billLineId: uuid("bill_line_id")
      .$type<BillLineId>()
      .notNull()
      .references(() => billLines.id, { onDelete: "cascade" }),
    type: text("type").$type<PaymentTxType>().notNull(),
    providerInstanceId: uuid("provider_instance_id")
      .$type<PaymentProviderInstanceId>()
      .notNull()
      .references(() => paymentProviderInstances.id, { onDelete: "restrict" }),
    clientId: text("client_id"),
    status: text("status").$type<PaymentTxStatus>().notNull().default("INITIATED"),
    amountFen: integer("amount_fen").notNull(),
    currency: text("currency").$type<"CNY">().notNull().default("CNY"),
    requestedBy: uuid("requested_by")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    merchantOrderNo: text("merchant_order_no"),
    merchantRefundNo: text("merchant_refund_no"),
    providerPrepayId: text("provider_prepay_id"),
    providerTransactionId: text("provider_transaction_id"),
    providerRefundId: text("provider_refund_id"),
    providerStatus: text("provider_status"),
    clientAction: jsonb("client_action").$type<unknown>(),
    providerSnapshot: jsonb("provider_snapshot").$type<unknown>(),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    billLineIdx: index("payment_txs_bill_line_idx").on(table.billLineId),
    providerInstanceIdx: index("payment_txs_provider_instance_idx").on(
      table.providerInstanceId,
    ),
    providerOrderUnique: uniqueIndex("payment_txs_provider_order_unique")
      .on(table.providerInstanceId, table.merchantOrderNo)
      .where(sql`${table.merchantOrderNo} is not null`),
    providerRefundUnique: uniqueIndex("payment_txs_provider_refund_unique")
      .on(table.providerInstanceId, table.merchantRefundNo)
      .where(sql`${table.merchantRefundNo} is not null`),
    statusUpdatedAtIdx: index("payment_txs_status_updated_at_idx").on(
      table.status,
      table.updatedAt,
    ),
  }),
);

export type PaymentProviderInstance =
  typeof paymentProviderInstances.$inferSelect;
export type NewPaymentProviderInstance =
  typeof paymentProviderInstances.$inferInsert;
export type PaymentTx = typeof paymentTxs.$inferSelect;
export type NewPaymentTx = typeof paymentTxs.$inferInsert;
