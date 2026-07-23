import {
  type BusinessNotificationTemplate,
  type NotificationAcknowledgementRequest,
  type NotificationAcknowledgementResult,
  type NotificationCancellationRequest,
  type NotificationCancellationResult,
  type NotificationInvalidationRequest,
  type NotificationInvalidationResult,
  type NotificationRequest,
  type NotificationRequestResult,
  notificationAcknowledgementRequestSchema,
  notificationCancellationRequestSchema,
  notificationInvalidationRequestSchema,
  notificationRequestSchema,
} from "../contracts";
import {
  canDispatchNotification,
  type NotificationChannelPort,
  type NotificationDispatchContextPort,
  type NotificationOptionPort,
  type NotificationSchedulingContextPort,
  type NotificationTaskSchedulerPort,
  type NotificationUntilAcknowledgedTaskSchedulerPort,
  type NotificationWindowAcknowledgementPort,
  type NotificationWindowInvalidationPort,
  type PreparedNotification,
  type ReadyActivityStartReminderDispatchContext,
  type ReadyConfirmationReminderDispatchContext,
  type ReadyMeetingPointUpdatedDispatchContext,
  type ReadyNewPartnerDispatchContext,
  type ReadyPRMessageSummaryDispatchContext,
  type ReadyPRReadyDispatchContext,
  type ReadyWaitlistAlternativeAvailableDispatchContext,
  type ReadyWaitlistPromotedDispatchContext,
} from "./ports";
import {
  prMessageSummaryCreationKey,
  prMessageSummaryCreationKeyPrefix,
} from "./pr-message-window";
import {
  notificationTaskPayloadSchema,
  type ActivityStartReminderNotificationTask,
  type ConfirmationReminderNotificationTask,
  type MeetingPointUpdatedNotificationTask,
  type NewPartnerNotificationTask,
  type NotificationTask,
  type PRMessageSummaryNotificationTask,
  type PRReadyNotificationTask,
  type WaitlistAlternativeAvailableNotificationTask,
  type WaitlistPromotedNotificationTask,
} from "./task";

const ACTIVITY_START_REMINDER_LEAD_MS = 20 * 60 * 1_000;
const ACTIVITY_START_REMINDER_REMARK = "提前时间更充足";
const WAITLIST_PROMOTED_STATUS = "候补成功";
const WAITLIST_PROMOTED_REMARK = "已为你保留名额";
const WAITLIST_ALTERNATIVE_AVAILABLE_STATUS = "有可加入名额";
const WAITLIST_ALTERNATIVE_AVAILABLE_REMARK = "同类同地点有其它 PR 可加入";
const NEW_PARTNER_TIP = "有新搭子加入";
const MEETING_POINT_UPDATE_TYPE = "碰头地点";
const MEETING_POINT_OPERATOR_NAME = "系统";
const PR_READY_STATUS = "已就绪";
const PR_READY_REMARK = "已成团，可下单；不可直接加入退出";
export const PR_MESSAGE_SUMMARY_DEBOUNCE_MS = 5 * 60 * 1_000;
const CONFIRMATION_REMINDER_REMARKS = {
  CONFIRM_START: "请尽快确认参与活动，超时您的席位将被释放",
  CONFIRM_END_MINUS_30M: "请尽快前往确认参与活动，还有30分钟就要截止了",
} as const;
// Job's internal representation for an unbounded late-claim window. Keeping
// the value here avoids a Notification-core dependency on Job infrastructure.
const NO_LATE_TOLERANCE_UNITS = -1;
const ONE_SECOND_UNBOUNDED_LATE_TIMING = {
  resolutionMs: 1_000,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
} as const;
const CONFIRMATION_START_TIMING = {
  resolutionMs: 1,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
} as const;
const CONFIRMATION_END_TIMING = {
  resolutionMs: 5 * 60 * 1_000,
  earlyToleranceUnits: 3,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
} as const;

export const resolveConfirmationReminderRunAt = (input: {
  reminder: "CONFIRM_START" | "CONFIRM_END_MINUS_30M";
  confirmationStartAt: string | null;
  confirmationEndAt: string | null;
}): Date | null => {
  if (input.reminder === "CONFIRM_START") {
    return input.confirmationStartAt ? new Date(input.confirmationStartAt) : null;
  }
  if (!input.confirmationEndAt) return null;
  return new Date(new Date(input.confirmationEndAt).getTime() - 30 * 60 * 1_000);
};

export type NotificationDispatchExecutionContext = {
  runAt: Date;
  windowStartCursor?: number | null;
  isCreationReservationHeld?(): Promise<boolean>;
};

export type NotificationDispatchResult = {
  disposition: "SUCCEEDED" | "SKIPPED" | "RETRYABLE_FAILURE" | "PERMANENT_FAILURE";
  reason: string;
  providerReference?: string | null;
};

export interface NotificationOwner {
  request<Template extends BusinessNotificationTemplate>(
    input: NotificationRequest<Template>,
  ): Promise<NotificationRequestResult>;
  cancel(input: NotificationCancellationRequest): Promise<NotificationCancellationResult>;
  invalidate(input: NotificationInvalidationRequest): Promise<NotificationInvalidationResult>;
  acknowledge(
    input: NotificationAcknowledgementRequest,
  ): Promise<NotificationAcknowledgementResult>;
  dispatch(
    payload: unknown,
    context?: NotificationDispatchExecutionContext,
  ): Promise<NotificationDispatchResult>;
  isChannelConfigured(input: {
    template: BusinessNotificationTemplate;
    channel: "WECHAT_SUBSCRIPTION";
  }): Promise<boolean>;
}

export type CreateNotificationOwnerDependencies = {
  scheduler: NotificationTaskSchedulerPort;
  windowInvalidation?: NotificationWindowInvalidationPort;
  windowAcknowledgement?: NotificationWindowAcknowledgementPort;
  options: NotificationOptionPort;
  schedulingContexts: NotificationSchedulingContextPort;
  contexts: NotificationDispatchContextPort;
  channel: NotificationChannelPort;
  now?: () => Date;
};

type ScheduledNotificationTask = {
  task: NotificationTask;
  runAt: Date;
} & (
  | { creationMode: "ONCE_PER_CAUSE"; creationKey: string }
  | {
      creationMode: "UNTIL_ACKNOWLEDGED";
      creationKey: string;
      windowStartCursor: number;
      highWaterCursor: number;
    }
  | {
      creationMode: "REPLACE_ACTIVE";
      coordinationKey: string;
      activeKeyPrefix: string;
      scheduleKey: string;
    }
);

type OncePerCauseScheduledNotificationTask = Extract<
  ScheduledNotificationTask,
  { creationMode: "ONCE_PER_CAUSE" }
>;

type ReplaceActiveScheduledNotificationTask = Extract<
  ScheduledNotificationTask,
  { creationMode: "REPLACE_ACTIVE" }
>;

type UntilAcknowledgedScheduledNotificationTask = Extract<
  ScheduledNotificationTask,
  { creationMode: "UNTIL_ACKNOWLEDGED" }
>;

const toCanonicalInstant = (value: string): string => new Date(value).toISOString();

const activityRecipientActiveKeyPrefix = (recipientUserId: string): string =>
  [
    "notification-active",
    "pr.activity-start-reminder",
    "WECHAT_SUBSCRIPTION",
    recipientUserId,
    "",
  ].join(":");

const activityActiveKeyPrefix = (input: { recipientUserId: string; aggregateId: string }): string =>
  `${activityRecipientActiveKeyPrefix(input.recipientUserId)}${input.aggregateId}:`;

const confirmationRecipientActiveKeyPrefix = (recipientUserId: string): string =>
  [
    "notification-active",
    "pr.confirmation-reminder",
    "WECHAT_SUBSCRIPTION",
    recipientUserId,
    "",
  ].join(":");

const confirmationAggregateActiveKeyPrefix = (input: {
  recipientUserId: string;
  aggregateId: string;
  reminder?: "CONFIRM_START" | "CONFIRM_END_MINUS_30M";
}): string =>
  `${confirmationRecipientActiveKeyPrefix(input.recipientUserId)}${input.aggregateId}:${input.reminder ? `${input.reminder}:` : ""}`;

/**
 * Alternative availability is a recoverable current-state fact. The private
 * replacement key preserves one active task for this exact source waitlist
 * cycle / candidate pair, while allowing an explicit later reconciliation to
 * create another task after the prior one has reached a terminal state.
 */
const waitlistAlternativeAvailableActiveKey = (input: {
  recipientUserId: string;
  sourcePartnerId: number;
  sourceWaitlistCycleId: string;
  candidatePrId: number;
}): string =>
  [
    "notification-active",
    "pr.waitlist-alternative-available",
    "WECHAT_SUBSCRIPTION",
    input.recipientUserId,
    input.sourcePartnerId,
    input.sourceWaitlistCycleId,
    input.candidatePrId,
    "",
  ].join(":");

const parsePartnerRequestAggregateId = (aggregateId: string): string => {
  const parsed = Number(aggregateId);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== aggregateId) {
    throw new Error("INVALID_ACTIVITY_NOTIFICATION_AGGREGATE");
  }
  return aggregateId;
};

const parsePRMessageSummaryAggregateId = (aggregateId: string): number => {
  const parsed = Number(aggregateId);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== aggregateId) {
    throw new Error("INVALID_PR_MESSAGE_NOTIFICATION_AGGREGATE");
  }
  return parsed;
};

const createActivityStartReminderTask = (
  input: NotificationRequest<"pr.activity-start-reminder">,
): ScheduledNotificationTask => {
  if (
    input.metadata.aggregate.type !== "partner_request" ||
    input.metadata.aggregate.id !== String(input.payload.prId)
  ) {
    throw new Error("INVALID_ACTIVITY_NOTIFICATION_AGGREGATE");
  }

  const activityStartAt = toCanonicalInstant(input.payload.activityStartAt);
  const coordinationKey = activityRecipientActiveKeyPrefix(input.recipientUserId);
  const activeKeyPrefix = activityActiveKeyPrefix({
    recipientUserId: input.recipientUserId,
    aggregateId: input.metadata.aggregate.id,
  });
  const task: ActivityStartReminderNotificationTask = {
    schemaVersion: 1,
    template: input.template,
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    payload: { prId: input.payload.prId, activityStartAt },
    aggregate: input.metadata.aggregate,
    causationId: input.metadata.causationId,
    ...(input.metadata.correlationId ? { correlationId: input.metadata.correlationId } : {}),
  };

  return {
    creationMode: "REPLACE_ACTIVE",
    task,
    coordinationKey,
    activeKeyPrefix,
    scheduleKey: `${activeKeyPrefix}${activityStartAt}`,
    runAt: new Date(new Date(activityStartAt).getTime() - ACTIVITY_START_REMINDER_LEAD_MS),
  };
};

const createWaitlistPromotedTask = (
  input: NotificationRequest<"pr.waitlist-promoted">,
  runAt: Date,
): OncePerCauseScheduledNotificationTask => {
  const task: WaitlistPromotedNotificationTask = {
    schemaVersion: 1,
    template: input.template,
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    payload: input.payload,
    aggregate: input.metadata.aggregate,
    causationId: input.metadata.causationId,
    ...(input.metadata.correlationId ? { correlationId: input.metadata.correlationId } : {}),
  };

  return {
    creationMode: "ONCE_PER_CAUSE",
    task,
    creationKey: [
      "notification",
      task.template,
      task.channel,
      task.recipientUserId,
      task.payload.prId,
      task.payload.partnerId,
      task.payload.waitlistCycleId,
    ].join(":"),
    runAt,
  };
};

const createWaitlistAlternativeAvailableTask = (
  input: NotificationRequest<"pr.waitlist-alternative-available">,
  runAt: Date,
): ReplaceActiveScheduledNotificationTask => {
  if (
    input.metadata.aggregate.type !== "partner_request" ||
    input.metadata.aggregate.id !== String(input.payload.sourcePrId)
  ) {
    throw new Error("INVALID_WAITLIST_ALTERNATIVE_NOTIFICATION_AGGREGATE");
  }

  const task: WaitlistAlternativeAvailableNotificationTask = {
    schemaVersion: 1,
    template: input.template,
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    payload: input.payload,
    aggregate: input.metadata.aggregate,
    causationId: input.metadata.causationId,
    ...(input.metadata.correlationId ? { correlationId: input.metadata.correlationId } : {}),
  };
  const activeKey = waitlistAlternativeAvailableActiveKey({
    recipientUserId: task.recipientUserId,
    sourcePartnerId: task.payload.sourcePartnerId,
    sourceWaitlistCycleId: task.payload.sourceWaitlistCycleId,
    candidatePrId: task.payload.candidatePrId,
  });

  return {
    creationMode: "REPLACE_ACTIVE",
    task,
    coordinationKey: activeKey,
    activeKeyPrefix: activeKey,
    scheduleKey: activeKey,
    runAt,
  };
};

const createNewPartnerTask = (
  input: NotificationRequest<"pr.new-partner">,
  runAt: Date,
): OncePerCauseScheduledNotificationTask => {
  if (
    input.metadata.aggregate.type !== "partner_request" ||
    input.metadata.aggregate.id !== String(input.payload.prId)
  ) {
    throw new Error("INVALID_NEW_PARTNER_NOTIFICATION_AGGREGATE");
  }

  const task: NewPartnerNotificationTask = {
    schemaVersion: 1,
    template: input.template,
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    payload: input.payload,
    aggregate: input.metadata.aggregate,
    causationId: input.metadata.causationId,
    ...(input.metadata.correlationId ? { correlationId: input.metadata.correlationId } : {}),
  };

  return {
    creationMode: "ONCE_PER_CAUSE",
    task,
    creationKey: [
      "notification",
      task.template,
      task.channel,
      task.recipientUserId,
      task.payload.prId,
      task.payload.partnerId,
      task.payload.admissionCycleId,
    ].join(":"),
    runAt,
  };
};

const createMeetingPointUpdatedTask = (
  input: NotificationRequest<"pr.meeting-point-updated">,
  runAt: Date,
): OncePerCauseScheduledNotificationTask => {
  if (
    input.metadata.aggregate.type !== "partner_request" ||
    input.metadata.aggregate.id !== String(input.payload.prId)
  ) {
    throw new Error("INVALID_MEETING_POINT_UPDATED_NOTIFICATION_AGGREGATE");
  }

  const task: MeetingPointUpdatedNotificationTask = {
    schemaVersion: 1,
    template: input.template,
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    payload: input.payload,
    aggregate: input.metadata.aggregate,
    causationId: input.metadata.causationId,
    ...(input.metadata.correlationId ? { correlationId: input.metadata.correlationId } : {}),
  };

  return {
    creationMode: "ONCE_PER_CAUSE",
    task,
    creationKey: [
      "notification",
      task.template,
      task.channel,
      task.recipientUserId,
      task.payload.prId,
      task.payload.meetingPointUpdateId,
    ].join(":"),
    runAt,
  };
};

const createPRReadyTask = (
  input: NotificationRequest<"pr.ready">,
  runAt: Date,
): OncePerCauseScheduledNotificationTask => {
  if (
    input.metadata.aggregate.type !== "partner_request" ||
    input.metadata.aggregate.id !== String(input.payload.prId)
  ) {
    throw new Error("INVALID_PR_READY_NOTIFICATION_AGGREGATE");
  }

  const task: PRReadyNotificationTask = {
    schemaVersion: 1,
    template: input.template,
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    payload: input.payload,
    aggregate: input.metadata.aggregate,
    causationId: input.metadata.causationId,
    ...(input.metadata.correlationId ? { correlationId: input.metadata.correlationId } : {}),
  };

  return {
    creationMode: "ONCE_PER_CAUSE",
    task,
    creationKey: [
      "notification",
      task.template,
      task.channel,
      task.recipientUserId,
      task.payload.prId,
      task.payload.readyCycleId,
    ].join(":"),
    runAt,
  };
};

/**
 * A PR-message task is a window reservation rather than a one-shot causal
 * send. The immutable start cursor is held by JobRunner's generic reservation
 * row and is deliberately not copied into this business task payload.
 */
const createPRMessageSummaryTask = (input: {
  request: NotificationRequest<"pr.message-summary">;
  windowStartCursor: number;
  windowOpenedAt: Date;
}): UntilAcknowledgedScheduledNotificationTask => {
  const { request } = input;
  if (
    request.metadata.aggregate.type !== "partner_request" ||
    request.metadata.aggregate.id !== String(request.payload.prId)
  ) {
    throw new Error("INVALID_PR_MESSAGE_NOTIFICATION_AGGREGATE");
  }
  if (!Number.isSafeInteger(input.windowStartCursor) || input.windowStartCursor <= 0) {
    throw new Error("INVALID_PR_MESSAGE_WINDOW_START_CURSOR");
  }
  if (!Number.isFinite(input.windowOpenedAt.getTime())) {
    throw new Error("INVALID_PR_MESSAGE_WINDOW_OPENED_AT");
  }

  const task: PRMessageSummaryNotificationTask = {
    schemaVersion: 1,
    template: request.template,
    recipientUserId: request.recipientUserId,
    channel: request.channel,
    payload: request.payload,
    aggregate: request.metadata.aggregate,
    causationId: request.metadata.causationId,
    ...(request.metadata.correlationId ? { correlationId: request.metadata.correlationId } : {}),
  };

  return {
    creationMode: "UNTIL_ACKNOWLEDGED",
    task,
    creationKey: prMessageSummaryCreationKey({
      recipientUserId: task.recipientUserId,
      prId: task.payload.prId,
    }),
    windowStartCursor: input.windowStartCursor,
    highWaterCursor: input.windowStartCursor,
    runAt: new Date(input.windowOpenedAt.getTime() + PR_MESSAGE_SUMMARY_DEBOUNCE_MS),
  };
};

/**
 * Internal policy application shared by the ordinary owner command and the
 * named transaction-bound waitlist-promotion integration. The scheduler is
 * deliberately the existing owner port, so neither caller can provide Job
 * type, version, timing or creation identity.
 */
export const requestWaitlistPromotedNotification = async (input: {
  request: NotificationRequest<"pr.waitlist-promoted">;
  scheduler: Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause">;
  requestedAt: Date;
}): Promise<NotificationRequestResult> => {
  const parsed = notificationRequestSchema.safeParse(input.request);
  if (!parsed.success || parsed.data.template !== "pr.waitlist-promoted") {
    throw new Error("INVALID_NOTIFICATION_REQUEST");
  }

  const scheduled = createWaitlistPromotedTask(parsed.data, input.requestedAt);
  return input.scheduler.enqueueOncePerCause({
    task: scheduled.task,
    creationKey: scheduled.creationKey,
    runAt: scheduled.runAt,
    timing: ONE_SECOND_UNBOUNDED_LATE_TIMING,
  });
};

/**
 * Reconciliation-only policy for a mutable availability fact.  This bypasses
 * the reminder scheduling-context path because PR has already supplied a
 * pure current-state context; dispatch performs the same strict recheck
 * immediately before a channel side effect.
 */
export const requestWaitlistAlternativeAvailableNotification = async (input: {
  request: NotificationRequest<"pr.waitlist-alternative-available">;
  scheduler: Pick<NotificationTaskSchedulerPort, "replaceActive">;
  requestedAt: Date;
}): Promise<NotificationRequestResult> => {
  const parsed = notificationRequestSchema.safeParse(input.request);
  if (!parsed.success || parsed.data.template !== "pr.waitlist-alternative-available") {
    throw new Error("INVALID_NOTIFICATION_REQUEST");
  }

  const scheduled = createWaitlistAlternativeAvailableTask(parsed.data, input.requestedAt);
  return input.scheduler.replaceActive({
    task: scheduled.task,
    coordinationKey: scheduled.coordinationKey,
    activeKeyPrefix: scheduled.activeKeyPrefix,
    scheduleKey: scheduled.scheduleKey,
    runAt: scheduled.runAt,
    timing: ONE_SECOND_UNBOUNDED_LATE_TIMING,
  });
};

/**
 * Internal policy application shared by the ordinary owner command and the
 * named transaction-bound active-admission integration. The admission cycle
 * is a durable source fact; Notification derives the private Job identity.
 */
export const requestNewPartnerNotification = async (input: {
  request: NotificationRequest<"pr.new-partner">;
  scheduler: Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause">;
  requestedAt: Date;
}): Promise<NotificationRequestResult> => {
  const parsed = notificationRequestSchema.safeParse(input.request);
  if (!parsed.success || parsed.data.template !== "pr.new-partner") {
    throw new Error("INVALID_NOTIFICATION_REQUEST");
  }

  const scheduled = createNewPartnerTask(parsed.data, input.requestedAt);
  return input.scheduler.enqueueOncePerCause({
    task: scheduled.task,
    creationKey: scheduled.creationKey,
    runAt: scheduled.runAt,
    timing: ONE_SECOND_UNBOUNDED_LATE_TIMING,
  });
};

/**
 * Internal policy for one committed effective meeting-point change. The
 * immutable event UUID identifies the source operation rather than a clock.
 */
export const requestMeetingPointUpdatedNotification = async (input: {
  request: NotificationRequest<"pr.meeting-point-updated">;
  scheduler: Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause">;
  requestedAt: Date;
}): Promise<NotificationRequestResult> => {
  const parsed = notificationRequestSchema.safeParse(input.request);
  if (!parsed.success || parsed.data.template !== "pr.meeting-point-updated") {
    throw new Error("INVALID_NOTIFICATION_REQUEST");
  }

  const scheduled = createMeetingPointUpdatedTask(parsed.data, input.requestedAt);
  return input.scheduler.enqueueOncePerCause({
    task: scheduled.task,
    creationKey: scheduled.creationKey,
    runAt: scheduled.runAt,
    timing: ONE_SECOND_UNBOUNDED_LATE_TIMING,
  });
};

/**
 * Internal policy for a committed PR READY entry. The durable ready cycle is
 * a source fact; Notification derives the private per-recipient Job identity.
 */
export const requestPRReadyNotification = async (input: {
  request: NotificationRequest<"pr.ready">;
  scheduler: Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause">;
  requestedAt: Date;
}): Promise<NotificationRequestResult> => {
  const parsed = notificationRequestSchema.safeParse(input.request);
  if (!parsed.success || parsed.data.template !== "pr.ready") {
    throw new Error("INVALID_NOTIFICATION_REQUEST");
  }

  const scheduled = createPRReadyTask(parsed.data, input.requestedAt);
  return input.scheduler.enqueueOncePerCause({
    task: scheduled.task,
    creationKey: scheduled.creationKey,
    runAt: scheduled.runAt,
    timing: ONE_SECOND_UNBOUNDED_LATE_TIMING,
  });
};

/**
 * Message windows are created only through the named atomic PR source port.
 * The source supplies message-local facts, while Notification still owns the
 * five-minute timing, recipient-private identity and Job creation mode.
 */
export const requestPRMessageSummaryNotification = async (input: {
  request: NotificationRequest<"pr.message-summary">;
  windowStartCursor: number;
  windowOpenedAt: Date;
  scheduler: NotificationUntilAcknowledgedTaskSchedulerPort;
}): Promise<NotificationRequestResult> => {
  const parsed = notificationRequestSchema.safeParse(input.request);
  if (!parsed.success || parsed.data.template !== "pr.message-summary") {
    throw new Error("INVALID_NOTIFICATION_REQUEST");
  }

  const scheduled = createPRMessageSummaryTask({
    request: parsed.data,
    windowStartCursor: input.windowStartCursor,
    windowOpenedAt: input.windowOpenedAt,
  });
  return input.scheduler.enqueueUntilAcknowledged({
    task: scheduled.task,
    creationKey: scheduled.creationKey,
    windowStartCursor: scheduled.windowStartCursor,
    highWaterCursor: scheduled.highWaterCursor,
    runAt: scheduled.runAt,
    timing: ONE_SECOND_UNBOUNDED_LATE_TIMING,
  });
};

const createConfirmationReminderTask = (
  input: NotificationRequest<"pr.confirmation-reminder">,
  runAt: Date,
): ScheduledNotificationTask => {
  if (
    input.metadata.aggregate.type !== "partner_request" ||
    input.metadata.aggregate.id !== String(input.payload.prId)
  ) {
    throw new Error("INVALID_CONFIRMATION_NOTIFICATION_AGGREGATE");
  }

  const task: ConfirmationReminderNotificationTask = {
    schemaVersion: 1,
    template: input.template,
    recipientUserId: input.recipientUserId,
    channel: input.channel,
    payload: input.payload,
    aggregate: input.metadata.aggregate,
    causationId: input.metadata.causationId,
    ...(input.metadata.correlationId ? { correlationId: input.metadata.correlationId } : {}),
  };
  const coordinationKey = confirmationRecipientActiveKeyPrefix(input.recipientUserId);
  const activeKeyPrefix = confirmationAggregateActiveKeyPrefix({
    recipientUserId: input.recipientUserId,
    aggregateId: input.metadata.aggregate.id,
    reminder: input.payload.reminder,
  });

  return {
    creationMode: "REPLACE_ACTIVE",
    task,
    coordinationKey,
    activeKeyPrefix,
    scheduleKey: `${activeKeyPrefix}${input.payload.slotId}:${runAt.toISOString()}`,
    runAt,
  };
};

/**
 * A template's Job timing and causal identity are owner-private declarative
 * policy. Add future templates here instead of teaching callers Job details.
 */
const notificationTaskPolicies = {
  "pr.activity-start-reminder": createActivityStartReminderTask,
  "pr.meeting-point-updated": createMeetingPointUpdatedTask,
  "pr.new-partner": createNewPartnerTask,
  "pr.ready": createPRReadyTask,
  "pr.waitlist-promoted": createWaitlistPromotedTask,
} as const;

const resolveTaskPolicy = (input: NotificationRequest, runAt: Date): ScheduledNotificationTask => {
  if (input.template === "pr.activity-start-reminder") {
    return notificationTaskPolicies[input.template](input);
  }
  if (input.template === "pr.meeting-point-updated") {
    return notificationTaskPolicies[input.template](input, runAt);
  }
  if (input.template === "pr.waitlist-promoted") {
    return notificationTaskPolicies[input.template](input, runAt);
  }
  if (input.template === "pr.new-partner") {
    return notificationTaskPolicies[input.template](input, runAt);
  }
  if (input.template === "pr.ready") {
    return notificationTaskPolicies[input.template](input, runAt);
  }
  if (input.template === "pr.confirmation-reminder") {
    return createConfirmationReminderTask(input, runAt);
  }
  throw new Error("NOTIFICATION_TEMPLATE_NOT_ENABLED");
};

const formatShanghaiDateTime = (value: string): string => {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")} ${read("hour")}:${read("minute")}`;
};

const renderActivityStartReminder = (input: {
  task: ActivityStartReminderNotificationTask;
  context: ReadyActivityStartReminderDispatchContext;
}): PreparedNotification => ({
  channel: input.task.channel,
  template: input.task.template,
  recipientChannelAddress: input.context.recipientChannelAddress,
  content: {
    activityName: input.context.activityName,
    startAt: formatShanghaiDateTime(input.context.activityStartAt),
    location: input.context.location,
    remark: ACTIVITY_START_REMINDER_REMARK,
    page: input.context.page,
  },
});

const renderWaitlistPromoted = (input: {
  task: WaitlistPromotedNotificationTask;
  context: ReadyWaitlistPromotedDispatchContext;
}): PreparedNotification => ({
  channel: input.task.channel,
  template: input.task.template,
  recipientChannelAddress: input.context.recipientChannelAddress,
  content: {
    title: input.context.title,
    status: WAITLIST_PROMOTED_STATUS,
    remark: WAITLIST_PROMOTED_REMARK,
    page: input.context.page,
  },
});

const renderWaitlistAlternativeAvailable = (input: {
  task: WaitlistAlternativeAvailableNotificationTask;
  context: ReadyWaitlistAlternativeAvailableDispatchContext;
}): PreparedNotification => ({
  channel: input.task.channel,
  template: input.task.template,
  recipientChannelAddress: input.context.recipientChannelAddress,
  content: {
    title: input.context.title,
    status: WAITLIST_ALTERNATIVE_AVAILABLE_STATUS,
    remark: WAITLIST_ALTERNATIVE_AVAILABLE_REMARK,
    page: input.context.page,
  },
});

const renderConfirmationReminder = (input: {
  task: ConfirmationReminderNotificationTask;
  context: ReadyConfirmationReminderDispatchContext;
}): PreparedNotification => ({
  channel: input.task.channel,
  template: input.task.template,
  recipientChannelAddress: input.context.recipientChannelAddress,
  content: {
    orderContent: input.context.title,
    orderNo: `PR-${input.task.payload.prId}-${input.task.recipientUserId.slice(-6)}`,
    appointmentAt: formatShanghaiDateTime(input.context.activityStartAt),
    remark: CONFIRMATION_REMINDER_REMARKS[input.task.payload.reminder],
    page: input.context.page,
  },
});

const renderNewPartner = (input: {
  task: NewPartnerNotificationTask;
  context: ReadyNewPartnerDispatchContext;
}): PreparedNotification => ({
  channel: input.task.channel,
  template: input.task.template,
  recipientChannelAddress: input.context.recipientChannelAddress,
  content: {
    applicantName: input.context.applicantName,
    teamName: input.context.teamName,
    tip: NEW_PARTNER_TIP,
    appliedAt: formatShanghaiDateTime(input.task.payload.joinedAtIso),
    page: input.context.page,
  },
});

const renderMeetingPointUpdated = (input: {
  task: MeetingPointUpdatedNotificationTask;
  context: ReadyMeetingPointUpdatedDispatchContext;
}): PreparedNotification => ({
  channel: input.task.channel,
  template: input.task.template,
  recipientChannelAddress: input.context.recipientChannelAddress,
  content: {
    updateType: MEETING_POINT_UPDATE_TYPE,
    operatorName: MEETING_POINT_OPERATOR_NAME,
    updatedAt: formatShanghaiDateTime(input.task.payload.updatedAtIso),
    meetingPointDescription: input.task.payload.meetingPointDescription,
    page: input.context.page,
  },
});

const renderPRReady = (input: {
  task: PRReadyNotificationTask;
  context: ReadyPRReadyDispatchContext;
}): PreparedNotification => ({
  channel: input.task.channel,
  template: input.task.template,
  recipientChannelAddress: input.context.recipientChannelAddress,
  content: {
    title: input.context.title,
    type: input.context.type,
    status: PR_READY_STATUS,
    remark: PR_READY_REMARK,
    page: input.context.page,
  },
});

const renderPRMessageSummary = (input: {
  task: PRMessageSummaryNotificationTask;
  context: ReadyPRMessageSummaryDispatchContext;
}): PreparedNotification => ({
  channel: input.task.channel,
  template: input.task.template,
  recipientChannelAddress: input.context.recipientChannelAddress,
  content: {
    threadTitle: input.context.threadTitle,
    authorName: input.context.authorName,
    sentAt: input.context.sentAt,
    messageSummary: input.context.messageSummary,
    page: input.context.page,
  },
});

/** Private business-template × channel binding registry. */
const notificationTemplateBindings = {
  "pr.confirmation-reminder": {
    channel: "WECHAT_SUBSCRIPTION",
    render: renderConfirmationReminder,
  },
  "pr.activity-start-reminder": {
    channel: "WECHAT_SUBSCRIPTION",
    render: renderActivityStartReminder,
  },
  "pr.new-partner": {
    channel: "WECHAT_SUBSCRIPTION",
    render: renderNewPartner,
  },
  "pr.meeting-point-updated": {
    channel: "WECHAT_SUBSCRIPTION",
    render: renderMeetingPointUpdated,
  },
  "pr.ready": {
    channel: "WECHAT_SUBSCRIPTION",
    render: renderPRReady,
  },
  "pr.message-summary": {
    channel: "WECHAT_SUBSCRIPTION",
    render: renderPRMessageSummary,
  },
  "pr.waitlist-promoted": {
    channel: "WECHAT_SUBSCRIPTION",
    render: renderWaitlistPromoted,
  },
  "pr.waitlist-alternative-available": {
    channel: "WECHAT_SUBSCRIPTION",
    render: renderWaitlistAlternativeAvailable,
  },
} as const;

export const createNotificationOwner = (
  dependencies: CreateNotificationOwnerDependencies,
): NotificationOwner => {
  const now = dependencies.now ?? (() => new Date());

  return {
    async isChannelConfigured(input) {
      return (await dependencies.channel.isConfigured?.(input)) ?? false;
    },

    async request<Template extends BusinessNotificationTemplate>(
      input: NotificationRequest<Template>,
    ): Promise<NotificationRequestResult> {
      const parsed = notificationRequestSchema.safeParse(input);
      if (!parsed.success) {
        throw new Error("INVALID_NOTIFICATION_REQUEST");
      }

      if (parsed.data.template === "pr.message-summary") {
        throw new Error("PR_MESSAGE_SUMMARY_REQUIRES_TRANSACTION_BOUND_SOURCE");
      }

      const requestedAt = now();
      if (parsed.data.template === "pr.waitlist-alternative-available") {
        return requestWaitlistAlternativeAvailableNotification({
          request: parsed.data,
          scheduler: dependencies.scheduler,
          requestedAt,
        });
      }
      if (parsed.data.template === "pr.waitlist-promoted") {
        return requestWaitlistPromotedNotification({
          request: parsed.data,
          scheduler: dependencies.scheduler,
          requestedAt,
        });
      }
      if (parsed.data.template === "pr.new-partner") {
        return requestNewPartnerNotification({
          request: parsed.data,
          scheduler: dependencies.scheduler,
          requestedAt,
        });
      }
      if (parsed.data.template === "pr.meeting-point-updated") {
        return requestMeetingPointUpdatedNotification({
          request: parsed.data,
          scheduler: dependencies.scheduler,
          requestedAt,
        });
      }
      if (parsed.data.template === "pr.ready") {
        return requestPRReadyNotification({
          request: parsed.data,
          scheduler: dependencies.scheduler,
          requestedAt,
        });
      }
      let scheduled: ScheduledNotificationTask;
      if (parsed.data.template === "pr.confirmation-reminder") {
        if (
          parsed.data.metadata.aggregate.type !== "partner_request" ||
          parsed.data.metadata.aggregate.id !== String(parsed.data.payload.prId)
        ) {
          throw new Error("INVALID_CONFIRMATION_NOTIFICATION_AGGREGATE");
        }
        if (!dependencies.schedulingContexts.resolveConfirmationReminder) {
          throw new Error("CONFIRMATION_NOTIFICATION_CONTEXT_NOT_CONFIGURED");
        }
        const schedulingContext = await dependencies.schedulingContexts.resolveConfirmationReminder(
          {
            prId: parsed.data.payload.prId,
            slotId: parsed.data.payload.slotId,
            recipientUserId: parsed.data.recipientUserId,
          },
        );
        if (schedulingContext.state === "SKIPPED") {
          await dependencies.scheduler.cancelActive({
            coordinationKey: confirmationRecipientActiveKeyPrefix(parsed.data.recipientUserId),
            activeKeyPrefix: confirmationAggregateActiveKeyPrefix({
              recipientUserId: parsed.data.recipientUserId,
              aggregateId: parsed.data.metadata.aggregate.id,
              ...(schedulingContext.reason === "CONFIRMATION_TRIGGER_UNAVAILABLE"
                ? { reminder: parsed.data.payload.reminder }
                : {}),
            }),
          });
          return { creation: "CANCELED" };
        }
        const runAt = resolveConfirmationReminderRunAt({
          reminder: parsed.data.payload.reminder,
          confirmationStartAt: schedulingContext.confirmationStartAt,
          confirmationEndAt: schedulingContext.confirmationEndAt,
        });
        if (!runAt) {
          await dependencies.scheduler.cancelActive({
            coordinationKey: confirmationRecipientActiveKeyPrefix(parsed.data.recipientUserId),
            activeKeyPrefix: confirmationAggregateActiveKeyPrefix({
              recipientUserId: parsed.data.recipientUserId,
              aggregateId: parsed.data.metadata.aggregate.id,
              reminder: parsed.data.payload.reminder,
            }),
          });
          return { creation: "CANCELED" };
        }
        scheduled = resolveTaskPolicy(parsed.data, runAt);
      } else {
        scheduled = resolveTaskPolicy(parsed.data, requestedAt);
      }
      if (scheduled.creationMode === "REPLACE_ACTIVE") {
        if (
          scheduled.task.template !== "pr.activity-start-reminder" &&
          scheduled.task.template !== "pr.confirmation-reminder"
        ) {
          throw new Error("INVALID_REPLACE_ACTIVE_NOTIFICATION_POLICY");
        }
        const [option, schedulingContext] = await Promise.all([
          dependencies.options.load({
            recipientUserId: scheduled.task.recipientUserId,
            template: scheduled.task.template,
            channel: scheduled.task.channel,
          }),
          scheduled.task.template === "pr.activity-start-reminder"
            ? dependencies.schedulingContexts.resolveActivityStartReminder({
                prId: scheduled.task.payload.prId,
                recipientUserId: scheduled.task.recipientUserId,
              })
            : dependencies.schedulingContexts.resolveConfirmationReminder
              ? dependencies.schedulingContexts.resolveConfirmationReminder({
                  prId: scheduled.task.payload.prId,
                  slotId: scheduled.task.payload.slotId,
                  recipientUserId: scheduled.task.recipientUserId,
                })
              : Promise.resolve({
                  state: "SKIPPED" as const,
                  reason: "CONFIRMATION_POLICY_UNAVAILABLE" as const,
                }),
        ]);
        let currentScheduleAt: string | null = null;
        if (schedulingContext.state === "READY") {
          if (
            scheduled.task.template === "pr.confirmation-reminder" &&
            "confirmationStartAt" in schedulingContext
          ) {
            const runAt = resolveConfirmationReminderRunAt({
              reminder: scheduled.task.payload.reminder,
              confirmationStartAt: schedulingContext.confirmationStartAt,
              confirmationEndAt: schedulingContext.confirmationEndAt,
            });
            currentScheduleAt = runAt?.toISOString() ?? null;
          } else if ("activityStartAt" in schedulingContext) {
            currentScheduleAt = toCanonicalInstant(schedulingContext.activityStartAt);
          }
        }
        const scheduledScheduleAt =
          scheduled.task.template === "pr.activity-start-reminder"
            ? scheduled.task.payload.activityStartAt
            : scheduled.runAt.toISOString();
        const cancelAggregate =
          scheduled.task.template === "pr.confirmation-reminder" &&
          schedulingContext.state === "SKIPPED" &&
          schedulingContext.reason !== "CONFIRMATION_TRIGGER_UNAVAILABLE";
        if (
          !canDispatchNotification(option) ||
          currentScheduleAt !== scheduledScheduleAt ||
          scheduled.runAt.getTime() <= requestedAt.getTime()
        ) {
          await dependencies.scheduler.cancelActive({
            coordinationKey: scheduled.coordinationKey,
            activeKeyPrefix: cancelAggregate
              ? confirmationAggregateActiveKeyPrefix({
                  recipientUserId: scheduled.task.recipientUserId,
                  aggregateId: scheduled.task.aggregate.id,
                })
              : scheduled.activeKeyPrefix,
          });
          return { creation: "CANCELED" };
        }
        const replacement = await dependencies.scheduler.replaceActive({
          task: scheduled.task,
          coordinationKey: scheduled.coordinationKey,
          activeKeyPrefix: scheduled.activeKeyPrefix,
          scheduleKey: scheduled.scheduleKey,
          runAt: scheduled.runAt,
          timing:
            scheduled.task.template === "pr.confirmation-reminder"
              ? scheduled.task.payload.reminder === "CONFIRM_START"
                ? CONFIRMATION_START_TIMING
                : CONFIRMATION_END_TIMING
              : ONE_SECOND_UNBOUNDED_LATE_TIMING,
        });
        const currentOption = await dependencies.options.load({
          recipientUserId: scheduled.task.recipientUserId,
          template: scheduled.task.template,
          channel: scheduled.task.channel,
        });
        if (!canDispatchNotification(currentOption)) {
          await dependencies.scheduler.cancelActive({
            coordinationKey: scheduled.coordinationKey,
            activeKeyPrefix: scheduled.activeKeyPrefix,
          });
          return { creation: "CANCELED" };
        }
        return replacement;
      }
      throw new Error("INVALID_NOTIFICATION_CREATION_POLICY");
    },

    async cancel(input: NotificationCancellationRequest): Promise<NotificationCancellationResult> {
      const parsed = notificationCancellationRequestSchema.safeParse(input);
      if (!parsed.success) {
        throw new Error("INVALID_NOTIFICATION_CANCELLATION_REQUEST");
      }
      const isConfirmation = parsed.data.template === "pr.confirmation-reminder";
      const coordinationKey = isConfirmation
        ? confirmationRecipientActiveKeyPrefix(parsed.data.recipientUserId)
        : activityRecipientActiveKeyPrefix(parsed.data.recipientUserId);
      const activeKeyPrefix = isConfirmation
        ? parsed.data.scope.kind === "RECIPIENT"
          ? coordinationKey
          : confirmationAggregateActiveKeyPrefix({
              recipientUserId: parsed.data.recipientUserId,
              aggregateId: parsePartnerRequestAggregateId(parsed.data.scope.aggregate.id),
              reminder:
                parsed.data.scope.kind === "TRIGGER" ? parsed.data.scope.reminder : undefined,
            })
        : parsed.data.scope.kind === "RECIPIENT"
          ? coordinationKey
          : activityActiveKeyPrefix({
              recipientUserId: parsed.data.recipientUserId,
              aggregateId: parsePartnerRequestAggregateId(parsed.data.scope.aggregate.id),
            });
      const canceled = await dependencies.scheduler.cancelActive({
        coordinationKey,
        activeKeyPrefix,
      });
      return { canceled };
    },

    async invalidate(
      input: NotificationInvalidationRequest,
    ): Promise<NotificationInvalidationResult> {
      const parsed = notificationInvalidationRequestSchema.safeParse(input);
      if (!parsed.success) {
        throw new Error("INVALID_NOTIFICATION_INVALIDATION_REQUEST");
      }
      const invalidation = dependencies.windowInvalidation;
      if (!invalidation) {
        throw new Error("NOTIFICATION_WINDOW_INVALIDATION_NOT_CONFIGURED");
      }

      if (parsed.data.scope.kind === "RECIPIENT") {
        const result = await invalidation.releaseHeldReservationsByCreationKeyPrefix({
          creationKeyPrefix: prMessageSummaryCreationKeyPrefix(parsed.data.recipientUserId),
        });
        return { released: result.released, canceled: result.canceled };
      }

      const prId = parsePRMessageSummaryAggregateId(parsed.data.scope.aggregate.id);
      const result = await invalidation.releaseHeldReservation({
        creationKey: prMessageSummaryCreationKey({
          recipientUserId: parsed.data.recipientUserId,
          prId,
        }),
      });
      return {
        released: result.released ? 1 : 0,
        canceled: result.canceled ? 1 : 0,
      };
    },

    async acknowledge(
      input: NotificationAcknowledgementRequest,
    ): Promise<NotificationAcknowledgementResult> {
      const parsed = notificationAcknowledgementRequestSchema.safeParse(input);
      if (!parsed.success) {
        throw new Error("INVALID_NOTIFICATION_ACKNOWLEDGEMENT_REQUEST");
      }
      const acknowledgement = dependencies.windowAcknowledgement;
      if (!acknowledgement) {
        throw new Error("NOTIFICATION_WINDOW_ACKNOWLEDGEMENT_NOT_CONFIGURED");
      }

      const prId = parsePRMessageSummaryAggregateId(parsed.data.aggregate.id);
      const result = await acknowledgement.acknowledgeHeldReservation({
        creationKey: prMessageSummaryCreationKey({
          recipientUserId: parsed.data.recipientUserId,
          prId,
        }),
        throughCursor: parsed.data.throughCursor,
      });
      return { released: result.released, stale: result.stale };
    },

    async dispatch(
      payload: unknown,
      executionContext?: NotificationDispatchExecutionContext,
    ): Promise<NotificationDispatchResult> {
      const parsed = notificationTaskPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return { disposition: "PERMANENT_FAILURE", reason: "INVALID_NOTIFICATION_TASK" };
      }

      const task = parsed.data;
      if (
        task.template !== "pr.confirmation-reminder" &&
        task.template !== "pr.activity-start-reminder" &&
        task.template !== "pr.new-partner" &&
        task.template !== "pr.meeting-point-updated" &&
        task.template !== "pr.ready" &&
        task.template !== "pr.message-summary" &&
        task.template !== "pr.waitlist-promoted" &&
        task.template !== "pr.waitlist-alternative-available"
      ) {
        return { disposition: "PERMANENT_FAILURE", reason: "UNSUPPORTED_NOTIFICATION_TEMPLATE" };
      }

      if (task.template === "pr.confirmation-reminder" && !executionContext) {
        return { disposition: "SKIPPED", reason: "MISSING_JOB_RUN_AT" };
      }

      const messageWindowStartCursor = executionContext?.windowStartCursor;
      const messageReservationHeld = executionContext?.isCreationReservationHeld;
      if (
        task.template === "pr.message-summary" &&
        (!messageReservationHeld ||
          !Number.isSafeInteger(messageWindowStartCursor) ||
          !messageWindowStartCursor ||
          messageWindowStartCursor <= 0)
      ) {
        return { disposition: "SKIPPED", reason: "MESSAGE_RESERVATION_CONTEXT_MISSING" };
      }

      const option = await dependencies.options.load({
        recipientUserId: task.recipientUserId,
        template: task.template,
        channel: task.channel,
      });
      if (!canDispatchNotification(option)) {
        return { disposition: "SKIPPED", reason: "NOTIFICATION_PREFERENCE_OR_CREDIT_INELIGIBLE" };
      }

      let prepared: PreparedNotification;
      if (task.template === "pr.confirmation-reminder") {
        if (!dependencies.contexts.resolveConfirmationReminder) {
          return {
            disposition: "PERMANENT_FAILURE",
            reason: "CONFIRMATION_NOTIFICATION_CONTEXT_NOT_CONFIGURED",
          };
        }
        const context = await dependencies.contexts.resolveConfirmationReminder(task);
        if (context.state === "SKIPPED") {
          return { disposition: "SKIPPED", reason: context.reason };
        }
        const currentRunAt = resolveConfirmationReminderRunAt({
          reminder: task.payload.reminder,
          confirmationStartAt: context.confirmationStartAt,
          confirmationEndAt: context.confirmationEndAt,
        });
        if (!currentRunAt) {
          return { disposition: "SKIPPED", reason: "CONFIRMATION_TRIGGER_UNAVAILABLE" };
        }
        if (executionContext && currentRunAt.getTime() !== executionContext.runAt.getTime()) {
          return { disposition: "SKIPPED", reason: "CONFIRMATION_REMINDER_CHANGED" };
        }
        if (new Date(context.activityStartAt).getTime() <= now().getTime()) {
          return { disposition: "SKIPPED", reason: "ACTIVITY_ALREADY_STARTED" };
        }
        prepared = notificationTemplateBindings[task.template].render({ task, context });
      } else if (task.template === "pr.activity-start-reminder") {
        const context = await dependencies.contexts.resolveActivityStartReminder(task);
        if (context.state === "SKIPPED") {
          return { disposition: "SKIPPED", reason: context.reason };
        }
        if (toCanonicalInstant(context.activityStartAt) !== task.payload.activityStartAt) {
          return { disposition: "SKIPPED", reason: "ACTIVITY_START_CHANGED" };
        }
        if (new Date(context.activityStartAt).getTime() <= now().getTime()) {
          return { disposition: "SKIPPED", reason: "ACTIVITY_ALREADY_STARTED" };
        }
        prepared = notificationTemplateBindings[task.template].render({ task, context });
      } else if (task.template === "pr.new-partner") {
        if (!dependencies.contexts.resolveNewPartner) {
          return {
            disposition: "PERMANENT_FAILURE",
            reason: "NEW_PARTNER_NOTIFICATION_CONTEXT_NOT_CONFIGURED",
          };
        }
        const context = await dependencies.contexts.resolveNewPartner(task);
        if (context.state === "SKIPPED") {
          return { disposition: "SKIPPED", reason: context.reason };
        }
        prepared = notificationTemplateBindings[task.template].render({ task, context });
      } else if (task.template === "pr.meeting-point-updated") {
        if (!dependencies.contexts.resolveMeetingPointUpdated) {
          return {
            disposition: "PERMANENT_FAILURE",
            reason: "MEETING_POINT_UPDATED_NOTIFICATION_CONTEXT_NOT_CONFIGURED",
          };
        }
        const context = await dependencies.contexts.resolveMeetingPointUpdated(task);
        if (context.state === "SKIPPED") {
          return { disposition: "SKIPPED", reason: context.reason };
        }
        prepared = notificationTemplateBindings[task.template].render({ task, context });
      } else if (task.template === "pr.ready") {
        if (!dependencies.contexts.resolvePRReady) {
          return {
            disposition: "PERMANENT_FAILURE",
            reason: "PR_READY_NOTIFICATION_CONTEXT_NOT_CONFIGURED",
          };
        }
        const context = await dependencies.contexts.resolvePRReady(task);
        if (context.state === "SKIPPED") {
          return { disposition: "SKIPPED", reason: context.reason };
        }
        prepared = notificationTemplateBindings[task.template].render({ task, context });
      } else if (task.template === "pr.message-summary") {
        if (!dependencies.contexts.resolvePRMessageSummary) {
          return {
            disposition: "SKIPPED",
            reason: "PR_MESSAGE_SUMMARY_NOTIFICATION_CONTEXT_NOT_CONFIGURED",
          };
        }
        const context = await dependencies.contexts.resolvePRMessageSummary(task, {
          windowStartCursor: messageWindowStartCursor!,
        });
        if (context.state === "SKIPPED") {
          return { disposition: "SKIPPED", reason: context.reason };
        }
        prepared = notificationTemplateBindings[task.template].render({ task, context });
      } else if (task.template === "pr.waitlist-alternative-available") {
        if (!dependencies.contexts.resolveWaitlistAlternativeAvailable) {
          return {
            disposition: "PERMANENT_FAILURE",
            reason: "WAITLIST_ALTERNATIVE_NOTIFICATION_CONTEXT_NOT_CONFIGURED",
          };
        }
        const context = await dependencies.contexts.resolveWaitlistAlternativeAvailable(task);
        if (context.state === "SKIPPED") {
          return { disposition: "SKIPPED", reason: context.reason };
        }
        prepared = notificationTemplateBindings[task.template].render({ task, context });
      } else {
        const context = await dependencies.contexts.resolveWaitlistPromoted(task);
        if (context.state === "SKIPPED") {
          return { disposition: "SKIPPED", reason: context.reason };
        }
        prepared = notificationTemplateBindings[task.template].render({ task, context });
      }

      if (task.template === "pr.message-summary" && !(await messageReservationHeld!())) {
        return { disposition: "SKIPPED", reason: "MESSAGE_RESERVATION_RELEASED" };
      }

      let channelResult: Awaited<ReturnType<NotificationChannelPort["send"]>>;
      try {
        channelResult = await dependencies.channel.send(prepared);
      } catch {
        return { disposition: "PERMANENT_FAILURE", reason: "AMBIGUOUS_CHANNEL_PORT_FAILURE" };
      }

      if (channelResult.outcome === "ACCEPTED") {
        if (option.credit.kind === "UNLIMITED") {
          return {
            disposition: "SUCCEEDED",
            reason: "CHANNEL_ACCEPTED",
            providerReference: channelResult.providerReference,
          };
        }

        try {
          const credit = await dependencies.options.consumeLimitedCredit({
            recipientUserId: task.recipientUserId,
            template: task.template,
            channel: task.channel,
          });
          if (task.template === "pr.confirmation-reminder" && credit.remaining <= 0) {
            await dependencies.scheduler.cancelActive({
              coordinationKey: confirmationRecipientActiveKeyPrefix(task.recipientUserId),
              activeKeyPrefix: confirmationRecipientActiveKeyPrefix(task.recipientUserId),
            });
          }
          return {
            disposition: "SUCCEEDED",
            reason: credit.consumed ? "CHANNEL_ACCEPTED" : "CHANNEL_ACCEPTED_CREDIT_UNAVAILABLE",
            providerReference: channelResult.providerReference,
          };
        } catch {
          return {
            disposition: "SUCCEEDED",
            reason: "CHANNEL_ACCEPTED_CREDIT_CONSEQUENCE_FAILED",
            providerReference: channelResult.providerReference,
          };
        }
      }

      if (channelResult.outcome === "RECIPIENT_PERMISSION_REVOKED") {
        try {
          await dependencies.options.clearRecipientPermission({
            recipientUserId: task.recipientUserId,
            template: task.template,
            channel: task.channel,
          });
          if (
            task.template === "pr.confirmation-reminder" ||
            task.template === "pr.activity-start-reminder"
          ) {
            const recipientPrefix =
              task.template === "pr.confirmation-reminder"
                ? confirmationRecipientActiveKeyPrefix(task.recipientUserId)
                : activityRecipientActiveKeyPrefix(task.recipientUserId);
            await dependencies.scheduler.cancelActive({
              coordinationKey: recipientPrefix,
              activeKeyPrefix: recipientPrefix,
            });
          }
          return { disposition: "PERMANENT_FAILURE", reason: "RECIPIENT_PERMISSION_REVOKED" };
        } catch {
          return {
            disposition: "PERMANENT_FAILURE",
            reason: "RECIPIENT_PERMISSION_REVOKED_CLEANUP_FAILED",
          };
        }
      }

      if (channelResult.outcome === "PROVEN_NOT_APPLIED_RETRYABLE") {
        return { disposition: "RETRYABLE_FAILURE", reason: "CHANNEL_PROVEN_NOT_APPLIED" };
      }

      if (channelResult.outcome === "AMBIGUOUS") {
        return { disposition: "PERMANENT_FAILURE", reason: "AMBIGUOUS_PROVIDER_OUTCOME" };
      }

      return { disposition: "PERMANENT_FAILURE", reason: "CHANNEL_PERMANENT_REFUSAL" };
    },
  };
};
