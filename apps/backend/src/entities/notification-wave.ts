import {
  bigserial,
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import type { WeChatNotificationKind } from "./user-notification-opt";
import { users, type UserId } from "./user";

export const notificationWaveStatusSchema = z.enum(["OPEN", "NOTIFIED", "RESOLVED", "CANCELED"]);
export type NotificationWaveStatus = z.infer<typeof notificationWaveStatusSchema>;

export const notificationWaves = pgTable(
  "notification_waves",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    notificationKind: text("notification_kind").$type<WeChatNotificationKind>().notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    recipientUserId: uuid("recipient_user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    waveKey: text("wave_key").notNull(),
    waveStartMessageId: bigint("wave_start_message_id", { mode: "number" }),
    status: text("status").$type<NotificationWaveStatus>().notNull().default("OPEN"),
    openedAt: timestamp("opened_at").notNull().defaultNow(),
    lastNotifiedAt: timestamp("last_notified_at"),
    resolvedAt: timestamp("resolved_at"),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    kindWaveKeyUq: uniqueIndex("notification_waves_kind_wave_key_uq").on(
      table.notificationKind,
      table.waveKey,
    ),
    aggregateIdx: index("notification_waves_aggregate_idx").on(
      table.aggregateType,
      table.aggregateId,
    ),
    recipientStatusIdx: index("notification_waves_recipient_status_idx").on(
      table.recipientUserId,
      table.status,
    ),
  }),
);

export const insertNotificationWaveSchema = createInsertSchema(notificationWaves);
export const selectNotificationWaveSchema = createSelectSchema(notificationWaves);

export type NotificationWaveRow = typeof notificationWaves.$inferSelect;
export type NewNotificationWaveRow = typeof notificationWaves.$inferInsert;
