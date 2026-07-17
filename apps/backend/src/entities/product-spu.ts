import { bigserial, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type {
  CatalogStatus,
  ProductPresentation,
  ProductType,
  ServicePolicy,
  SpuSalesPolicy,
} from "../domains/merchandising/model";

export const productSpus = pgTable(
  "product_spus",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    version: integer("version").notNull().default(1),
    status: text("status").$type<CatalogStatus>().notNull().default("DRAFT"),
    name: text("name").notNull(),
    productType: text("product_type").$type<ProductType>().notNull(),
    salesPolicy: jsonb("sales_policy").$type<SpuSalesPolicy>().notNull(),
    servicePolicy: jsonb("service_policy").$type<ServicePolicy>().notNull(),
    presentation: jsonb("presentation").$type<ProductPresentation>().notNull(),
    facts: jsonb("facts").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productTypeStatusIdx: index("product_spus_product_type_status_idx").on(
      table.productType,
      table.status,
    ),
  }),
);

export type ProductSpu = typeof productSpus.$inferSelect;
export type NewProductSpu = typeof productSpus.$inferInsert;
export type ProductSpuId = ProductSpu["id"];
