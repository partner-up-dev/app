import { bigint, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  OrderFamily,
  OrderParticipantSnapshot,
  OrderStatus,
  OrderTerminationAttempt,
  OrderTimeout,
  SplitRuleSnapshot,
  OrderItemSnapshot,
} from "../domains/trade/model";
import { offers, type OfferId } from "./offer";
import { users, type UserId } from "./user";

export type TradeOrderId = string & { readonly __brand: "TradeOrderId" };

export const tradeOrders = pgTable(
  "trade_orders",
  {
    id: uuid("id")
      .$type<TradeOrderId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    family: text("family").$type<OrderFamily>().notNull(),
    offerId: bigint("offer_id", { mode: "number" })
      .$type<OfferId>()
      .notNull()
      .references(() => offers.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").$type<OrderStatus>().notNull().default("OPEN"),
    participants: jsonb("participants").$type<OrderParticipantSnapshot[]>().notNull(),
    splitRuleSnapshot: jsonb("split_rule_snapshot").$type<SplitRuleSnapshot>().notNull(),
    items: jsonb("items").$type<OrderItemSnapshot[]>().notNull(),
    timeout: jsonb("timeout").$type<OrderTimeout>().notNull(),
    terminationAttempts: jsonb("termination_attempts")
      .$type<OrderTerminationAttempt[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    familyStatusIdx: index("trade_orders_family_status_idx").on(
      table.family,
      table.status,
    ),
    offerStatusIdx: index("trade_orders_offer_status_idx").on(
      table.offerId,
      table.status,
    ),
  }),
);

export type TradeOrder = typeof tradeOrders.$inferSelect;
export type NewTradeOrder = typeof tradeOrders.$inferInsert;
