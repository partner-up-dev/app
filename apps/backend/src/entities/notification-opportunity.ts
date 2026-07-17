import { sql } from "drizzle-orm";
import {
  bigserial,
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { jobs } from "./job";
import type { WeChatNotificationKind } from "./user-notification-opt";
import { users, type UserId } from "./user";

export const notificationLifecycleModelSchema = z.enum(["ONE_SHOT", "WAVE"]);
export type NotificationLifecycleModel = z.infer<typeof notificationLifecycleModelSchema>;

export const notificationOpportunityStatusSchema = z.enum([
  "CREATED",
  "SCHEDULED",
  "DISPATCHING",
  "SENT",
  "SKIPPED",
  "FAILED",
  "CANCELED",
]);
export type NotificationOpportunityStatus = z.infer<typeof notificationOpportunityStatusSchema>;

export const notificationChannelSchema = z.enum([
  "WECHAT_SUBSCRIPTION",
  "WECHAT_TEMPLATE",
  "EMAIL",
  "SMS",
]);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const notificationOpportunities = pgTable(
  "notification_opportunities",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobId: bigint("job_id", { mode: "number" }).references(() => jobs.id, {
      onDelete: "set null",
    }),
    notificationKind: text("notification_kind").$type<WeChatNotificationKind>().notNull(),
    lifecycleModel: text("lifecycle_model").$type<NotificationLifecycleModel>().notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    recipientUserId: uuid("recipient_user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: text("channel").$type<NotificationChannel>().notNull(),
    status: text("status").$type<NotificationOpportunityStatus>().notNull().default("CREATED"),
    runAt: timestamp("run_at").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    dedupeKeyUq: uniqueIndex("notification_opportunities_dedupe_key_uq").on(table.dedupeKey),
    jobIdIdx: index("notification_opportunities_job_id_idx").on(table.jobId),
    aggregateIdx: index("notification_opportunities_aggregate_idx").on(
      table.aggregateType,
      table.aggregateId,
    ),
    recipientStatusIdx: index("notification_opportunities_recipient_status_idx").on(
      table.recipientUserId,
      table.status,
    ),
  }),
);

export const insertNotificationOpportunitySchema = createInsertSchema(notificationOpportunities);
export const selectNotificationOpportunitySchema = createSelectSchema(notificationOpportunities);

export type NotificationOpportunityRow = typeof notificationOpportunities.$inferSelect;
export type NewNotificationOpportunityRow = typeof notificationOpportunities.$inferInsert;
