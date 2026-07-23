import { z } from "zod";

const positiveIntegerSchema = z.number().int().positive();
const userIdSchema = z.string().uuid();

export const businessNotificationTemplateSchema = z.enum([
  "pr.confirmation-reminder",
  "pr.activity-start-reminder",
  "pr.new-partner",
  "pr.meeting-point-updated",
  "pr.ready",
  "pr.message-summary",
  "pr.waitlist-promoted",
  "pr.waitlist-alternative-available",
]);

export type BusinessNotificationTemplate = z.infer<typeof businessNotificationTemplateSchema>;

export const businessNotificationChannelSchema = z.literal("WECHAT_SUBSCRIPTION");
export type BusinessNotificationChannel = z.infer<typeof businessNotificationChannelSchema>;

export const notificationAggregateSchema = z
  .object({
    type: z.string().trim().min(1).max(80),
    id: z.string().trim().min(1).max(128),
  })
  .strict();
export const notificationCausationIdSchema = z.string().trim().min(1).max(160);
export const notificationCorrelationIdSchema = z.string().trim().min(1).max(160);

export const notificationTaskMetadataSchema = z
  .object({
    aggregate: notificationAggregateSchema,
    causationId: notificationCausationIdSchema,
    correlationId: notificationCorrelationIdSchema.optional(),
  })
  .strict();

export type NotificationTaskMetadata = z.infer<typeof notificationTaskMetadataSchema>;

export const confirmationReminderTriggerSchema = z.enum(["CONFIRM_START", "CONFIRM_END_MINUS_30M"]);
export type ConfirmationReminderTrigger = z.infer<typeof confirmationReminderTriggerSchema>;

const confirmationReminderPayloadSchema = z
  .object({
    prId: positiveIntegerSchema,
    slotId: positiveIntegerSchema,
    reminder: confirmationReminderTriggerSchema,
  })
  .strict();
const activityStartReminderPayloadSchema = z
  .object({
    prId: positiveIntegerSchema,
    activityStartAt: z.string().datetime({ offset: true }),
  })
  .strict();
const newPartnerPayloadSchema = z
  .object({
    prId: positiveIntegerSchema,
    partnerId: positiveIntegerSchema,
    joinedUserId: userIdSchema,
    joinedAtIso: z.string().datetime({ offset: true }),
    admissionCycleId: z.string().uuid(),
  })
  .strict();
const meetingPointUpdatedPayloadSchema = z
  .object({
    prId: positiveIntegerSchema,
    meetingPointUpdateId: z.string().uuid(),
    meetingPointDescription: z.string().trim().min(1),
    updatedAtIso: z.string().datetime({ offset: true }),
  })
  .strict();
const prReadyPayloadSchema = z
  .object({
    prId: positiveIntegerSchema,
    readyCycleId: z.string().uuid(),
  })
  .strict();
const prMessageSummaryPayloadSchema = z.object({ prId: positiveIntegerSchema }).strict();
const waitlistPromotedPayloadSchema = z
  .object({
    prId: positiveIntegerSchema,
    partnerId: positiveIntegerSchema,
    waitlistCycleId: z.string().uuid(),
  })
  .strict();
const waitlistAlternativeAvailablePayloadSchema = z
  .object({
    sourcePrId: positiveIntegerSchema,
    sourcePartnerId: positiveIntegerSchema,
    sourceWaitlistCycleId: z.string().uuid(),
    candidatePrId: positiveIntegerSchema,
  })
  .strict();

/**
 * Stable business payload vocabulary. Provider template IDs and provider field
 * names deliberately do not appear here.
 */
export const notificationTemplatePayloadSchemas = {
  "pr.confirmation-reminder": confirmationReminderPayloadSchema,
  "pr.activity-start-reminder": activityStartReminderPayloadSchema,
  "pr.new-partner": newPartnerPayloadSchema,
  "pr.meeting-point-updated": meetingPointUpdatedPayloadSchema,
  "pr.ready": prReadyPayloadSchema,
  "pr.message-summary": prMessageSummaryPayloadSchema,
  "pr.waitlist-promoted": waitlistPromotedPayloadSchema,
  "pr.waitlist-alternative-available": waitlistAlternativeAvailablePayloadSchema,
} as const;

export type NotificationPayloadByTemplate = {
  [Template in BusinessNotificationTemplate]: z.infer<
    (typeof notificationTemplatePayloadSchemas)[Template]
  >;
};

const notificationRequestFor = <
  Template extends BusinessNotificationTemplate,
  PayloadSchema extends z.ZodType,
>(
  template: Template,
  payloadSchema: PayloadSchema,
) =>
  z
    .object({
      template: z.literal(template),
      recipientUserId: userIdSchema,
      channel: businessNotificationChannelSchema,
      payload: payloadSchema,
      metadata: notificationTaskMetadataSchema,
    })
    .strict();

export const notificationRequestSchema = z.discriminatedUnion("template", [
  notificationRequestFor("pr.confirmation-reminder", confirmationReminderPayloadSchema),
  notificationRequestFor("pr.activity-start-reminder", activityStartReminderPayloadSchema),
  notificationRequestFor("pr.new-partner", newPartnerPayloadSchema),
  notificationRequestFor("pr.meeting-point-updated", meetingPointUpdatedPayloadSchema),
  notificationRequestFor("pr.ready", prReadyPayloadSchema),
  notificationRequestFor("pr.message-summary", prMessageSummaryPayloadSchema),
  notificationRequestFor("pr.waitlist-promoted", waitlistPromotedPayloadSchema),
  notificationRequestFor(
    "pr.waitlist-alternative-available",
    waitlistAlternativeAvailablePayloadSchema,
  ),
]);

type NotificationRequestUnion = z.infer<typeof notificationRequestSchema>;

export type NotificationRequest<
  Template extends BusinessNotificationTemplate = BusinessNotificationTemplate,
> = Extract<NotificationRequestUnion, { template: Template }>;

export type NotificationRequestResult = {
  creation: "CREATED" | "COALESCED" | "CANCELED";
};

const partnerRequestAggregateSchema = z
  .object({
    type: z.literal("partner_request"),
    id: z.string().trim().min(1).max(128),
  })
  .strict();

const activityReminderCancellationRequestSchema = z
  .object({
    template: z.literal("pr.activity-start-reminder"),
    recipientUserId: userIdSchema,
    scope: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("RECIPIENT") }).strict(),
      z.object({ kind: z.literal("AGGREGATE"), aggregate: partnerRequestAggregateSchema }).strict(),
    ]),
  })
  .strict();

const confirmationReminderCancellationRequestSchema = z
  .object({
    template: z.literal("pr.confirmation-reminder"),
    recipientUserId: userIdSchema,
    scope: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("RECIPIENT") }).strict(),
      z
        .object({
          kind: z.literal("AGGREGATE"),
          aggregate: partnerRequestAggregateSchema,
        })
        .strict(),
      z
        .object({
          kind: z.literal("TRIGGER"),
          aggregate: partnerRequestAggregateSchema,
          reminder: z.enum(["CONFIRM_START", "CONFIRM_END_MINUS_30M"]),
        })
        .strict(),
    ]),
  })
  .strict();

export const notificationCancellationRequestSchema = z.union([
  activityReminderCancellationRequestSchema,
  confirmationReminderCancellationRequestSchema,
]);

/**
 * Semantic invalidation for mutable reminder work. Job type, active
 * key and provider/channel details remain private to Notification.
 */
export type NotificationCancellationRequest = z.infer<typeof notificationCancellationRequestSchema>;

export type NotificationCancellationResult = {
  canceled: number;
};

const prMessageSummaryInvalidationRequestSchema = z
  .object({
    template: z.literal("pr.message-summary"),
    recipientUserId: userIdSchema,
    scope: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("RECIPIENT") }).strict(),
      z
        .object({
          kind: z.literal("AGGREGATE"),
          aggregate: partnerRequestAggregateSchema,
        })
        .strict(),
    ]),
  })
  .strict();

export const notificationInvalidationRequestSchema = prMessageSummaryInvalidationRequestSchema;

/**
 * A semantic reason to stop representing current user attention. Notification
 * owns aggregate/recipient scope and private key mapping; Job sees neither.
 */
export type NotificationInvalidationRequest = z.infer<typeof notificationInvalidationRequestSchema>;

export type NotificationInvalidationResult = {
  released: number;
  canceled: number;
};

/**
 * The browser-visible message cursor is PR-owned. Notification receives only
 * that semantic identity and derives the private held-reservation key.
 */
export const notificationAcknowledgementRequestSchema = z
  .object({
    template: z.literal("pr.message-summary"),
    aggregate: partnerRequestAggregateSchema,
    recipientUserId: userIdSchema,
    throughCursor: positiveIntegerSchema,
  })
  .strict();

export type NotificationAcknowledgementRequest = z.infer<
  typeof notificationAcknowledgementRequestSchema
>;

/**
 * These are attention-window facts, not Job row or provider state. HTTP
 * callers intentionally do not need either field to decide browser behavior.
 */
export type NotificationAcknowledgementResult = {
  released: boolean;
  stale: boolean;
};
