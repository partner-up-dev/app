import {
  bigint,
  index,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { partnerRequests, type PRId } from "./partner-request";
import { offers, type OfferId } from "./offer";
import { tradeOrders, type TradeOrderId } from "./trade-order";

export const prAttachedOrders = pgTable(
  "pr_attached_orders",
  {
    orderId: uuid("order_id")
      .$type<TradeOrderId>()
      .primaryKey()
      .references(() => tradeOrders.id, { onDelete: "cascade" }),
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    offerId: bigint("offer_id", { mode: "number" })
      .$type<OfferId>()
      .notNull()
      .references(() => offers.id, { onDelete: "restrict" }),
    detachedAt: timestamp("detached_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    prOfferIdx: index("pr_attached_orders_pr_offer_idx").on(
      table.prId,
      table.offerId,
    ),
    prIdx: index("pr_attached_orders_pr_idx").on(table.prId),
  }),
);

export type PRAttachedOrder = typeof prAttachedOrders.$inferSelect;
export type NewPRAttachedOrder = typeof prAttachedOrders.$inferInsert;
