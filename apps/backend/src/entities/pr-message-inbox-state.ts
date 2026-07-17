import { bigint, index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { partnerRequests, type PRId } from "./partner-request";
import { prMessages, type PRMessageId } from "./pr-message";
import { users, type UserId } from "./user";

export const prMessageInboxStates = pgTable(
  "pr_message_inbox_states",
  {
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadMessageId: bigint("last_read_message_id", { mode: "number" })
      .$type<PRMessageId | null>()
      .references(() => prMessages.id, { onDelete: "set null" }),
    lastNotifiedMessageId: bigint("last_notified_message_id", {
      mode: "number",
    })
      .$type<PRMessageId | null>()
      .references(() => prMessages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.prId, table.userId],
    }),
    userIdIdx: index("pr_message_inbox_states_user_id_idx").on(table.userId),
  }),
);

export const insertPRMessageInboxStateSchema = createInsertSchema(prMessageInboxStates);
export const selectPRMessageInboxStateSchema = createSelectSchema(prMessageInboxStates);

export type PRMessageInboxState = typeof prMessageInboxStates.$inferSelect;
export type NewPRMessageInboxState = typeof prMessageInboxStates.$inferInsert;
