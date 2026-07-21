import { bigint, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { OfferId } from "./offer";
import { offers } from "./offer";
import type { ProductSkuId } from "./product-sku";
import { productSkus } from "./product-sku";
import type { ProductSpuId } from "./product-spu";
import { productSpus } from "./product-spu";
import type { PriceExplanation } from "../domains/merchandising/model/pricing";
import type { ProductType } from "../domains/merchandising/model/product";
import type {
  OrderParticipantSnapshot,
  RentalRegistrant,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
} from "../domains/trade/model";

export type OfferQuoteId = string & { readonly __brand: "OfferQuoteId" };
export type OfferListingSessionId = string & {
  readonly __brand: "OfferListingSessionId";
};

export type OfferQuoteItemKind = "FIXED" | "CHOICE_CANDIDATE";

export type OfferQuotePriceSnapshot = {
  currency: "CNY";
  totalFen: number | null;
  range?: {
    minFen: number | null;
    maxFen: number | null;
  } | null;
  explanations: PriceExplanation[];
};

export type RentalQuoteListingContextSnapshot = {
  productType: "RENTAL";
  participants: OrderParticipantSnapshot[];
  serviceStartAt: string;
  serviceEndAt: string;
  contactPhone: string;
  registrants: RentalRegistrant[];
};

export type RideHailingQuoteListingContextSnapshot = {
  productType: "RIDE_HAILING";
  participants: OrderParticipantSnapshot[];
  route: RideHailingRouteSnapshot;
  departureAt: string | null;
  riders: RideHailingRiderSnapshot[];
  contactPhone: string;
};

export type OfferQuoteListingContextSnapshot =
  | RentalQuoteListingContextSnapshot
  | RideHailingQuoteListingContextSnapshot;

export type RentalFulfillmentQuoteSnapshot = {
  productType: "RENTAL";
};

export type RideHailingFulfillmentQuoteSnapshot = {
  productType: "RIDE_HAILING";
  providerInstanceId: string;
  providerName: string;
  providerVehicleTypeCode: string;
  providerVehicleTypeName: string;
  providerQuoteId: string | null;
  providerQuoteExpiresAt: string | null;
  providerSnapshot: unknown;
  estimateAmountFen: number;
  distanceMeters: number | null;
  durationSeconds: number | null;
  displayName: string;
};

export type OfferQuoteFulfillmentSnapshot =
  | RentalFulfillmentQuoteSnapshot
  | RideHailingFulfillmentQuoteSnapshot;

export const commerceQuotes = pgTable(
  "commerce_quotes",
  {
    id: uuid("id")
      .$type<OfferQuoteId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    listingSessionId: uuid("listing_session_id").$type<OfferListingSessionId>().notNull(),
    offerId: bigint("offer_id", { mode: "number" })
      .$type<OfferId>()
      .notNull()
      .references(() => offers.id, { onDelete: "restrict" }),
    productType: text("product_type").$type<ProductType>().notNull(),
    itemKind: text("item_kind").$type<OfferQuoteItemKind>().notNull(),
    spuId: bigint("spu_id", { mode: "number" })
      .$type<ProductSpuId>()
      .notNull()
      .references(() => productSpus.id, { onDelete: "restrict" }),
    skuId: bigint("sku_id", { mode: "number" })
      .$type<ProductSkuId>()
      .notNull()
      .references(() => productSkus.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    listingContextSnapshot: jsonb("listing_context_snapshot")
      .$type<OfferQuoteListingContextSnapshot>()
      .notNull(),
    fulfillmentQuoteSnapshot: jsonb("fulfillment_quote_snapshot")
      .$type<OfferQuoteFulfillmentSnapshot>()
      .notNull(),
    pricingSnapshot: jsonb("pricing_snapshot").$type<OfferQuotePriceSnapshot>().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    listingSessionIdx: index("commerce_quotes_listing_session_idx").on(table.listingSessionId),
    offerSkuIdx: index("commerce_quotes_offer_sku_idx").on(table.offerId, table.skuId),
    expiresAtIdx: index("commerce_quotes_expires_at_idx").on(table.expiresAt),
  }),
);

export type CommerceQuote = typeof commerceQuotes.$inferSelect;
export type NewCommerceQuote = typeof commerceQuotes.$inferInsert;
