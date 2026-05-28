import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  OrderOfferSnapshot,
  OrderParticipantSnapshot,
  OrderPricingSnapshot,
  OrderStatus,
  OrderTerminationAttempt,
  OrderTimeout,
  RentalRegistrant,
  SplitRuleSnapshot,
  TradeOrder as TradeOrderModel,
  OrderItemSnapshot,
} from "../domains/trade";
import { users, type UserId } from "./user";

export type TradeOrderId = string & { readonly __brand: "TradeOrderId" };

export const tradeOrders = pgTable(
  "trade_orders",
  {
    id: uuid("id")
      .$type<TradeOrderId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    family: text("family").$type<TradeOrderModel["family"]>().notNull(),
    createdBy: uuid("created_by")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").$type<OrderStatus>().notNull().default("OPEN"),
    participants: jsonb("participants").$type<OrderParticipantSnapshot[]>().notNull(),
    splitRuleSnapshot: jsonb("split_rule_snapshot").$type<SplitRuleSnapshot>().notNull(),
    offerSnapshot: jsonb("offer_snapshot").$type<OrderOfferSnapshot>().notNull(),
    items: jsonb("items").$type<OrderItemSnapshot[]>().notNull(),
    pricingSnapshot: jsonb("pricing_snapshot").$type<OrderPricingSnapshot>().notNull(),
    timeout: jsonb("timeout").$type<OrderTimeout>().notNull(),
    terminationAttempts: jsonb("termination_attempts")
      .$type<OrderTerminationAttempt[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    selectedZoneCodes: text("selected_zone_codes")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    serviceStartAt: timestamp("service_start_at", { withTimezone: true }),
    serviceEndAt: timestamp("service_end_at", { withTimezone: true }),
    participantCount: integer("participant_count"),
    contactPhone: text("contact_phone"),
    registrants: jsonb("registrants")
      .$type<RentalRegistrant[]>()
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
    serviceStartIdx: index("trade_orders_service_start_idx").on(table.serviceStartAt),
  }),
);

export type TradeOrder = typeof tradeOrders.$inferSelect;
export type NewTradeOrder = typeof tradeOrders.$inferInsert;
