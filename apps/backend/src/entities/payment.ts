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
import type { BillId, BillLineId } from "./bill";
import { bills, billLines } from "./bill";
import type {
  PaymentChannel,
  PaymentClientProviderBindingStatus,
  PaymentDirection,
  PaymentProviderCredentialSetStatus,
  PaymentProviderInstanceConfig,
  PaymentProviderInstanceStatus,
  PaymentProviderType,
  PaymentTxStatus,
  WeChatPayVerifierConfig,
} from "../domains/payment";
import { users, type UserId } from "./user";

export type PaymentProviderInstanceId = string & {
  readonly __brand: "PaymentProviderInstanceId";
};
export type PaymentProviderCredentialSetId = string & {
  readonly __brand: "PaymentProviderCredentialSetId";
};
export type PaymentClientProviderBindingId = string & {
  readonly __brand: "PaymentClientProviderBindingId";
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
    config: jsonb("config").$type<PaymentProviderInstanceConfig>().notNull(),
    activeCredentialSetId: uuid("active_credential_set_id").$type<
      PaymentProviderCredentialSetId | null
    >(),
    supportedChannels: text("supported_channels")
      .array()
      .$type<PaymentChannel[]>()
      .notNull(),
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
  }),
);

export const paymentProviderCredentialSets = pgTable(
  "payment_provider_credential_sets",
  {
    id: uuid("id")
      .$type<PaymentProviderCredentialSetId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    providerInstanceId: uuid("provider_instance_id")
      .$type<PaymentProviderInstanceId>()
      .notNull()
      .references(() => paymentProviderInstances.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<PaymentProviderCredentialSetStatus>()
      .notNull()
      .default("ACTIVE"),
    merchantSerialNo: text("merchant_serial_no").notNull(),
    merchantPrivateKeyPem: text("merchant_private_key_pem").notNull(),
    apiV3Key: text("api_v3_key").notNull(),
    verifier: jsonb("verifier").$type<WeChatPayVerifierConfig>().notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerInstanceIdx: index(
      "payment_provider_credential_sets_instance_idx",
    ).on(table.providerInstanceId),
  }),
);

export const paymentClientProviderBindings = pgTable(
  "payment_client_provider_bindings",
  {
    id: uuid("id")
      .$type<PaymentClientProviderBindingId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: text("client_id").notNull(),
    providerInstanceId: uuid("provider_instance_id")
      .$type<PaymentProviderInstanceId>()
      .notNull()
      .references(() => paymentProviderInstances.id, { onDelete: "cascade" }),
    channel: text("channel").$type<PaymentChannel>().notNull(),
    status: text("status")
      .$type<PaymentClientProviderBindingStatus>()
      .notNull()
      .default("ACTIVE"),
    priority: integer("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clientStatusPriorityIdx: index(
      "payment_client_provider_bindings_client_status_priority_idx",
    ).on(table.clientId, table.status, table.priority),
  }),
);

export const paymentTxs = pgTable(
  "payment_txs",
  {
    id: uuid("id")
      .$type<PaymentTxId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    billId: uuid("bill_id")
      .$type<BillId>()
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    billLineId: uuid("bill_line_id")
      .$type<BillLineId>()
      .notNull()
      .references(() => billLines.id, { onDelete: "cascade" }),
    direction: text("direction").$type<PaymentDirection>().notNull(),
    providerType: text("provider_type").$type<PaymentProviderType>().notNull(),
    providerInstanceId: uuid("provider_instance_id")
      .$type<PaymentProviderInstanceId>()
      .notNull()
      .references(() => paymentProviderInstances.id, { onDelete: "restrict" }),
    clientId: text("client_id").notNull(),
    channel: text("channel").$type<PaymentChannel>().notNull(),
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
    billIdx: index("payment_txs_bill_idx").on(table.billId),
    billLineIdx: index("payment_txs_bill_line_idx").on(table.billLineId),
    providerInstanceIdx: index("payment_txs_provider_instance_idx").on(
      table.providerInstanceId,
    ),
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
export type PaymentProviderCredentialSet =
  typeof paymentProviderCredentialSets.$inferSelect;
export type NewPaymentProviderCredentialSet =
  typeof paymentProviderCredentialSets.$inferInsert;
export type PaymentClientProviderBinding =
  typeof paymentClientProviderBindings.$inferSelect;
export type NewPaymentClientProviderBinding =
  typeof paymentClientProviderBindings.$inferInsert;
export type PaymentTx = typeof paymentTxs.$inferSelect;
export type NewPaymentTx = typeof paymentTxs.$inferInsert;
