import { bigserial, bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { partnerRequests, type PRId } from "./partner-request";
import { users, type UserId } from "./user";

export const PR_MESSAGE_BODY_MAX_LENGTH = 1000;

export const prMessageBodySchema = z.string().trim().min(1).max(PR_MESSAGE_BODY_MAX_LENGTH);

export const prMessages = pgTable(
  "pr_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    prId: bigint("pr_id", { mode: "number" })
      .$type<PRId>()
      .notNull()
      .references(() => partnerRequests.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    prIdCreatedAtIdx: index("pr_messages_pr_id_created_at_idx").on(
      table.prId,
      table.createdAt,
      table.id,
    ),
    authorUserIdIdx: index("pr_messages_author_user_id_idx").on(table.authorUserId),
  }),
);

export const insertPRMessageSchema = createInsertSchema(prMessages, {
  body: prMessageBodySchema,
});
export const selectPRMessageSchema = createSelectSchema(prMessages, {
  body: prMessageBodySchema,
});

export type PRMessage = typeof prMessages.$inferSelect;
export type NewPRMessage = typeof prMessages.$inferInsert;
export type PRMessageId = PRMessage["id"];
