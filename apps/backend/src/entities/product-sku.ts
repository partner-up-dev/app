import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { CatalogStatus, PricingModel, SkuFacts } from "../domains/merchandising/model";
import { productSpus, type ProductSpuId } from "./product-spu";

export type SkuCancellationPolicyRef = {
  policyId: string;
  policyVersion: number;
};

export const productSkus = pgTable(
  "product_skus",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    spuId: bigint("spu_id", { mode: "number" })
      .$type<ProductSpuId>()
      .notNull()
      .references(() => productSpus.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    status: text("status").$type<CatalogStatus>().notNull().default("DRAFT"),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    facts: jsonb("facts").$type<SkuFacts>().notNull(),
    pricingModel: jsonb("pricing_model").$type<PricingModel>().notNull(),
    cancellationPolicyRef: jsonb("cancellation_policy_ref")
      .$type<SkuCancellationPolicyRef | null>()
      .default(null),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    spuSortOrderIdx: index("product_skus_spu_sort_order_idx").on(
      table.spuId,
      table.sortOrder,
    ),
  }),
);

export type ProductSku = typeof productSkus.$inferSelect;
export type NewProductSku = typeof productSkus.$inferInsert;
export type ProductSkuId = ProductSku["id"];
