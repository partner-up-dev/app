import {
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { BillLineKind, BillStatus } from "../domains/bill";
import { tradeOrders, type TradeOrderId } from "./trade-order";
import { users, type UserId } from "./user";

export type BillId = string & { readonly __brand: "BillId" };
export type BillLineId = string & { readonly __brand: "BillLineId" };

export const bills = pgTable(
  "bills",
  {
    id: uuid("id")
      .$type<BillId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceOrderId: uuid("source_order_id")
      .$type<TradeOrderId>()
      .notNull()
      .references(() => tradeOrders.id, { onDelete: "cascade" }),
    status: text("status").$type<BillStatus>().notNull().default("ACTIVE"),
    currency: text("currency").$type<"CNY">().notNull().default("CNY"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceOrderIdx: index("bills_source_order_idx").on(table.sourceOrderId),
    sourceOrderUnique: uniqueIndex("bills_source_order_unique").on(
      table.sourceOrderId,
    ),
  }),
);

export const billLines = pgTable(
  "bill_lines",
  {
    id: uuid("id")
      .$type<BillLineId>()
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    billId: uuid("bill_id")
      .$type<BillId>()
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    kind: text("kind").$type<BillLineKind>().notNull(),
    amountFen: integer("amount_fen").notNull(),
    currency: text("currency").$type<"CNY">().notNull().default("CNY"),
    label: text("label").notNull(),
    description: text("description"),
    refundOfBillLineId: uuid("refund_of_bill_line_id")
      .$type<BillLineId | null>()
      .references((): AnyPgColumn => billLines.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    billKindIdx: index("bill_lines_bill_kind_idx").on(table.billId, table.kind),
    userIdx: index("bill_lines_user_idx").on(table.userId),
    refundOfBillLineIdx: index("bill_lines_refund_of_bill_line_idx").on(
      table.refundOfBillLineId,
    ),
  }),
);

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type BillLine = typeof billLines.$inferSelect;
export type NewBillLine = typeof billLines.$inferInsert;
