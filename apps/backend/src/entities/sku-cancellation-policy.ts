import { index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { productSkus, type ProductSkuId } from "./product-sku";

export type CancellationTier = {
  code: string;
  fromMinutesBeforeStart: number | null;
  untilMinutesBeforeStart: number | null;
  refundPercent: number;
  requiresOperatorHandling: boolean;
  visibleLabel: string;
};

export const skuCancellationPolicies = pgTable(
  "sku_cancellation_policies",
  {
    policyId: text("policy_id").notNull(),
    policyVersion: integer("policy_version").notNull(),
    skuId: integer("sku_id")
      .$type<ProductSkuId>()
      .notNull()
      .references(() => productSkus.id, { onDelete: "cascade" }),
    basis: text("basis").$type<"CUSTOMER_PAID_AMOUNT">().notNull(),
    operatorBufferMinutes: integer("operator_buffer_minutes").notNull(),
    tiers: jsonb("tiers").$type<CancellationTier[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.policyId, table.policyVersion],
      name: "sku_cancellation_policies_pk",
    }),
    skuVersionIdx: index("sku_cancellation_policies_sku_version_idx").on(
      table.skuId,
      table.policyVersion,
    ),
  }),
);

export type SkuCancellationPolicy = typeof skuCancellationPolicies.$inferSelect;
export type NewSkuCancellationPolicy = typeof skuCancellationPolicies.$inferInsert;
