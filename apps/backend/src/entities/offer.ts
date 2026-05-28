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
import { sql } from "drizzle-orm";
import type { ProductType, PricingRule } from "../domains/merchandising";

export type OfferStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export const offers = pgTable(
  "offers",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    status: text("status").$type<OfferStatus>().notNull().default("DRAFT"),
    productType: text("product_type").$type<ProductType>().notNull(),
    spuIds: bigint("spu_ids", { mode: "number" })
      .array()
      .notNull()
      .default(sql`ARRAY[]::bigint[]`),
    pricingPolicy: jsonb("pricing_policy")
      .$type<{ rules: PricingRule[] }>()
      .notNull(),
    termsVersion: integer("terms_version").notNull().default(1),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productTypeStatusIdx: index("offers_product_type_status_idx").on(
      table.productType,
      table.status,
    ),
  }),
);

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;
export type OfferId = Offer["id"];
