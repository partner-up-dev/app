import { bigint, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { partnerRequests, type PRId } from "./partner-request";
import { users, type UserId } from "./user";

export const prJoinNoticeAcceptances = pgTable(
  "pr_join_notice_acceptances",
  {
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gateKey: text("gate_key").notNull(),
    gateVersion: text("gate_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    prUserGateVersionUnique: unique("pr_join_notice_acceptances_scope_uq").on(
      table.prId,
      table.userId,
      table.gateKey,
      table.gateVersion,
    ),
  }),
);

export const insertPRJoinNoticeAcceptanceSchema = createInsertSchema(prJoinNoticeAcceptances);
export const selectPRJoinNoticeAcceptanceSchema = createSelectSchema(prJoinNoticeAcceptances);

export type PRJoinNoticeAcceptance = typeof prJoinNoticeAcceptances.$inferSelect;
export type NewPRJoinNoticeAcceptance = typeof prJoinNoticeAcceptances.$inferInsert;
