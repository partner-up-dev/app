import {
  cancelNotification,
  requestNotification,
  type NotificationCancellationRequest,
  type NotificationCancellationResult,
  type NotificationRequest,
  type NotificationRequestResult,
} from "../../notification";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import {
  getActivityStartReminderSchedulingContext,
  type ActivityStartReminderSchedulingContext,
} from "../queries/get-activity-start-reminder-notification-context";

export type ActivityStartReminderParticipantInput = {
  prId: PRId;
  recipientUserId: UserId;
};

export type ActivityStartReminderReconcilerDependencies = {
  listCurrentParticipations: (recipientUserId: UserId) => Promise<Array<{ prId: PRId }>>;
  loadCurrentContext: (
    input: ActivityStartReminderParticipantInput,
  ) => Promise<ActivityStartReminderSchedulingContext>;
  request: (
    input: NotificationRequest<"pr.activity-start-reminder">,
  ) => Promise<NotificationRequestResult>;
  cancel: (input: NotificationCancellationRequest) => Promise<NotificationCancellationResult>;
};

export type ActivityStartReminderReconciliationResult =
  | { outcome: "REQUESTED"; creation: NotificationRequestResult["creation"] }
  | { outcome: "CANCELED"; canceled: number };

export type ActivityStartReminderRecipientReconciliationResult = {
  canceled: number;
  reconciledPrIds: PRId[];
};

const partnerRepo = new PartnerRepository();

const defaultDependencies: ActivityStartReminderReconcilerDependencies = {
  listCurrentParticipations: (recipientUserId) => partnerRepo.findActiveByUserId(recipientUserId),
  loadCurrentContext: getActivityStartReminderSchedulingContext,
  request: requestNotification,
  cancel: cancelNotification,
};

const aggregateFor = (prId: PRId) => ({
  type: "partner_request" as const,
  id: String(prId),
});

export const cancelActivityStartReminderForParticipant = async (
  input: ActivityStartReminderParticipantInput,
  dependencies: Pick<ActivityStartReminderReconcilerDependencies, "cancel"> = defaultDependencies,
): Promise<NotificationCancellationResult> =>
  dependencies.cancel({
    template: "pr.activity-start-reminder",
    recipientUserId: input.recipientUserId,
    scope: {
      kind: "AGGREGATE",
      aggregate: aggregateFor(input.prId),
    },
  });

/**
 * Reconciles one participant from current PR-owned facts. Notification owns
 * eligibility, timing, replacement identity and channel-provider details.
 */
export const reconcileActivityStartReminderForParticipant = async (
  input: ActivityStartReminderParticipantInput,
  dependencies: ActivityStartReminderReconcilerDependencies = defaultDependencies,
): Promise<ActivityStartReminderReconciliationResult> => {
  const current = await dependencies.loadCurrentContext(input);
  if (current.state === "SKIPPED") {
    const cancellation = await cancelActivityStartReminderForParticipant(input, dependencies);
    return { outcome: "CANCELED", canceled: cancellation.canceled };
  }

  const activityStartAt = new Date(current.activityStartAt).toISOString();
  const request = await dependencies.request({
    template: "pr.activity-start-reminder",
    recipientUserId: input.recipientUserId,
    channel: "WECHAT_SUBSCRIPTION",
    payload: {
      prId: input.prId,
      activityStartAt,
    },
    metadata: {
      aggregate: aggregateFor(input.prId),
      causationId: `partner_request:${input.prId}:activity-start-reminder:${input.recipientUserId}:${activityStartAt}`,
    },
  });
  return { outcome: "REQUESTED", creation: request.creation };
};

/**
 * Rebuilds one recipient's activity reminders exclusively from current active
 * PR participation. Recipient invalidation happens before current facts are
 * re-requested, without exposing Notification's private Job identity.
 */
export const reconcileActivityStartRemindersForRecipient = async (
  input: { recipientUserId: UserId },
  dependencies: ActivityStartReminderReconcilerDependencies = defaultDependencies,
): Promise<ActivityStartReminderRecipientReconciliationResult> => {
  const cancellation = await dependencies.cancel({
    template: "pr.activity-start-reminder",
    recipientUserId: input.recipientUserId,
    scope: { kind: "RECIPIENT" },
  });
  const participations = await dependencies.listCurrentParticipations(input.recipientUserId);
  const prIds = Array.from(new Set(participations.map((participation) => participation.prId)));

  for (const prId of prIds) {
    await reconcileActivityStartReminderForParticipant(
      { prId, recipientUserId: input.recipientUserId },
      dependencies,
    );
  }

  return { canceled: cancellation.canceled, reconciledPrIds: prIds };
};
