import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users, type UserId } from "./user";

export const wechatNotificationKindSchema = z.enum([
  "REMINDER_CONFIRMATION",
  "ACTIVITY_START_REMINDER",
  "NEW_PARTNER",
  "MEETING_POINT_UPDATED",
  "PR_READY",
  "WAITLIST_PROMOTED",
  "WAITLIST_ALTERNATIVE_AVAILABLE",
  "PR_MESSAGE",
]);
export type WeChatNotificationKind = z.infer<
  typeof wechatNotificationKindSchema
>;

export const userNotificationOpts = pgTable("user_notification_opts", {
  userId: uuid("user_id")
    .$type<UserId>()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  wechatReminderOptIn: boolean("wechat_reminder_opt_in")
    .notNull()
    .default(false),
  wechatReminderOptInAt: timestamp("wechat_reminder_opt_in_at"),
  wechatReminderRemainingCount: integer("wechat_reminder_remaining_count")
    .notNull()
    .default(0),
  wechatActivityStartReminderOptIn: boolean(
    "wechat_activity_start_reminder_opt_in",
  )
    .notNull()
    .default(false),
  wechatActivityStartReminderOptInAt: timestamp(
    "wechat_activity_start_reminder_opt_in_at",
  ),
  wechatActivityStartReminderRemainingCount: integer(
    "wechat_activity_start_reminder_remaining_count",
  )
    .notNull()
    .default(0),
  wechatNewPartnerOptIn: boolean("wechat_new_partner_opt_in")
    .notNull()
    .default(false),
  wechatNewPartnerOptInAt: timestamp("wechat_new_partner_opt_in_at"),
  wechatNewPartnerRemainingCount: integer("wechat_new_partner_remaining_count")
    .notNull()
    .default(0),
  wechatMeetingPointUpdatedOptIn: boolean("wechat_meeting_point_updated_opt_in")
    .notNull()
    .default(false),
  wechatMeetingPointUpdatedOptInAt: timestamp(
    "wechat_meeting_point_updated_opt_in_at",
  ),
  wechatMeetingPointUpdatedRemainingCount: integer(
    "wechat_meeting_point_updated_remaining_count",
  )
    .notNull()
    .default(0),
  wechatPrReadyOptIn: boolean("wechat_pr_ready_opt_in")
    .notNull()
    .default(false),
  wechatPrReadyOptInAt: timestamp("wechat_pr_ready_opt_in_at"),
  wechatPrReadyRemainingCount: integer("wechat_pr_ready_remaining_count")
    .notNull()
    .default(0),
  wechatWaitlistPromotedOptIn: boolean("wechat_waitlist_promoted_opt_in")
    .notNull()
    .default(false),
  wechatWaitlistPromotedOptInAt: timestamp(
    "wechat_waitlist_promoted_opt_in_at",
  ),
  wechatWaitlistPromotedRemainingCount: integer(
    "wechat_waitlist_promoted_remaining_count",
  )
    .notNull()
    .default(0),
  wechatWaitlistAlternativeAvailableOptIn: boolean(
    "wechat_waitlist_alternative_available_opt_in",
  )
    .notNull()
    .default(false),
  wechatWaitlistAlternativeAvailableOptInAt: timestamp(
    "wechat_waitlist_alternative_available_opt_in_at",
  ),
  wechatWaitlistAlternativeAvailableRemainingCount: integer(
    "wechat_waitlist_alternative_available_remaining_count",
  )
    .notNull()
    .default(0),
  wechatPrMessageOptIn: boolean("wechat_pr_message_opt_in")
    .notNull()
    .default(false),
  wechatPrMessageOptInAt: timestamp("wechat_pr_message_opt_in_at"),
  wechatPrMessageRemainingCount: integer("wechat_pr_message_remaining_count")
    .notNull()
    .default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserNotificationOptSchema =
  createInsertSchema(userNotificationOpts);
export const selectUserNotificationOptSchema =
  createSelectSchema(userNotificationOpts);

export type UserNotificationOpt = typeof userNotificationOpts.$inferSelect;
export type NewUserNotificationOpt = typeof userNotificationOpts.$inferInsert;
