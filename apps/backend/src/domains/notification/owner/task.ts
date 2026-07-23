import { z } from "zod";
import {
  businessNotificationChannelSchema,
  notificationAggregateSchema,
  notificationCausationIdSchema,
  notificationCorrelationIdSchema,
  notificationTemplatePayloadSchemas,
} from "../contracts";

const notificationTaskFor = <
  Template extends keyof typeof notificationTemplatePayloadSchemas,
  PayloadSchema extends z.ZodType,
>(
  template: Template,
  payloadSchema: PayloadSchema,
) =>
  z
    .object({
      schemaVersion: z.literal(1),
      template: z.literal(template),
      recipientUserId: z.string().uuid(),
      channel: businessNotificationChannelSchema,
      payload: payloadSchema,
      aggregate: notificationAggregateSchema,
      causationId: notificationCausationIdSchema,
      correlationId: notificationCorrelationIdSchema.optional(),
    })
    .strict();

/**
 * This is the durable Job payload for the generic Notification task.  It is
 * private to the owner/Job integration; callers submit a NotificationRequest
 * instead and cannot select the task version or Job mechanics. Metadata is
 * flattened here so the durable task retains aggregate/causation fields as
 * first-class typed facts rather than hiding them in a command envelope.
 */
export const notificationTaskPayloadSchema = z.discriminatedUnion("template", [
  notificationTaskFor(
    "pr.confirmation-reminder",
    notificationTemplatePayloadSchemas["pr.confirmation-reminder"],
  ),
  notificationTaskFor(
    "pr.activity-start-reminder",
    notificationTemplatePayloadSchemas["pr.activity-start-reminder"],
  ),
  notificationTaskFor("pr.new-partner", notificationTemplatePayloadSchemas["pr.new-partner"]),
  notificationTaskFor(
    "pr.meeting-point-updated",
    notificationTemplatePayloadSchemas["pr.meeting-point-updated"],
  ),
  notificationTaskFor("pr.ready", notificationTemplatePayloadSchemas["pr.ready"]),
  notificationTaskFor(
    "pr.message-summary",
    notificationTemplatePayloadSchemas["pr.message-summary"],
  ),
  notificationTaskFor(
    "pr.waitlist-promoted",
    notificationTemplatePayloadSchemas["pr.waitlist-promoted"],
  ),
  notificationTaskFor(
    "pr.waitlist-alternative-available",
    notificationTemplatePayloadSchemas["pr.waitlist-alternative-available"],
  ),
]);

export type NotificationTask = z.infer<typeof notificationTaskPayloadSchema>;
export type ActivityStartReminderNotificationTask = Extract<
  NotificationTask,
  { template: "pr.activity-start-reminder" }
>;
export type ConfirmationReminderNotificationTask = Extract<
  NotificationTask,
  { template: "pr.confirmation-reminder" }
>;
export type NewPartnerNotificationTask = Extract<NotificationTask, { template: "pr.new-partner" }>;
export type MeetingPointUpdatedNotificationTask = Extract<
  NotificationTask,
  { template: "pr.meeting-point-updated" }
>;
export type PRReadyNotificationTask = Extract<NotificationTask, { template: "pr.ready" }>;
export type PRMessageSummaryNotificationTask = Extract<
  NotificationTask,
  { template: "pr.message-summary" }
>;
export type WaitlistPromotedNotificationTask = Extract<
  NotificationTask,
  { template: "pr.waitlist-promoted" }
>;
export type WaitlistAlternativeAvailableNotificationTask = Extract<
  NotificationTask,
  { template: "pr.waitlist-alternative-available" }
>;
