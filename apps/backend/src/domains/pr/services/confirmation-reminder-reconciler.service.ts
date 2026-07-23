import {
  cancelNotification,
  requestNotification,
  type ConfirmationReminderTrigger,
  type NotificationCancellationRequest,
  type NotificationCancellationResult,
  type NotificationRequest,
  type NotificationRequestResult,
} from "../../notification";
import type { PRId } from "../../../entities/partner-request";
import type { PartnerId } from "../../../entities/partner";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import {
  getConfirmationReminderSchedulingContext,
  type ConfirmationReminderNotificationContextInput,
  type ConfirmationReminderSchedulingContext,
} from "../queries/get-confirmation-reminder-notification-context";

export type ConfirmationReminderParticipantInput = {
  prId: PRId;
  slotId: PartnerId;
  recipientUserId: UserId;
};

export type ConfirmationReminderReconcilerDependencies = {
  listCurrentParticipations: (
    recipientUserId: UserId,
  ) => Promise<Array<{ prId: PRId; slotId: PartnerId }>>;
  loadCurrentContext: (
    input: ConfirmationReminderNotificationContextInput,
  ) => Promise<ConfirmationReminderSchedulingContext>;
  request: (
    input: NotificationRequest<"pr.confirmation-reminder">,
  ) => Promise<NotificationRequestResult>;
  cancel: (input: NotificationCancellationRequest) => Promise<NotificationCancellationResult>;
};

export type ConfirmationReminderReconciliationResult = {
  requested: ConfirmationReminderTrigger[];
  canceled: number;
};

export type ConfirmationReminderRecipientReconciliationResult = {
  canceled: number;
  reconciled: Array<{ prId: PRId; slotId: PartnerId }>;
};

const partnerRepo = new PartnerRepository();

const defaultDependencies: ConfirmationReminderReconcilerDependencies = {
  listCurrentParticipations: async (recipientUserId) => {
    const active = await partnerRepo.findActiveByUserId(recipientUserId);
    return active.map((slot) => ({ prId: slot.prId, slotId: slot.id }));
  },
  loadCurrentContext: getConfirmationReminderSchedulingContext,
  request: requestNotification,
  cancel: cancelNotification,
};

const aggregateFor = (prId: PRId) => ({
  type: "partner_request" as const,
  id: String(prId),
});

const triggerCancellation = (
  input: ConfirmationReminderParticipantInput,
  reminder: ConfirmationReminderTrigger,
) => ({
  template: "pr.confirmation-reminder" as const,
  recipientUserId: input.recipientUserId,
  scope: {
    kind: "TRIGGER" as const,
    aggregate: aggregateFor(input.prId),
    reminder,
  },
});

const aggregateCancellation = (input: ConfirmationReminderParticipantInput) => ({
  template: "pr.confirmation-reminder" as const,
  recipientUserId: input.recipientUserId,
  scope: { kind: "AGGREGATE" as const, aggregate: aggregateFor(input.prId) },
});

export const cancelConfirmationRemindersForParticipant = async (
  input: ConfirmationReminderParticipantInput,
  dependencies: Pick<ConfirmationReminderReconcilerDependencies, "cancel"> = defaultDependencies,
): Promise<NotificationCancellationResult> => dependencies.cancel(aggregateCancellation(input));

const isGlobalSkip = (
  context: ConfirmationReminderSchedulingContext,
): context is Extract<ConfirmationReminderSchedulingContext, { state: "SKIPPED" }> =>
  context.state === "SKIPPED";

/**
 * Reconcile one active slot against both independent confirmation triggers.
 * Trigger-scoped cancellation deliberately preserves the sibling trigger.
 */
export const reconcileConfirmationRemindersForParticipant = async (
  input: ConfirmationReminderParticipantInput,
  dependencies: ConfirmationReminderReconcilerDependencies = defaultDependencies,
): Promise<ConfirmationReminderReconciliationResult> => {
  const context = await dependencies.loadCurrentContext(input);
  if (isGlobalSkip(context)) {
    const cancellation = await cancelConfirmationRemindersForParticipant(input, dependencies);
    return { requested: [], canceled: cancellation.canceled };
  }

  let canceled = 0;
  const requested: ConfirmationReminderTrigger[] = [];
  for (const reminder of ["CONFIRM_START", "CONFIRM_END_MINUS_30M"] as const) {
    const anchor =
      reminder === "CONFIRM_START" ? context.confirmationStartAt : context.confirmationEndAt;
    if (!anchor) {
      const cancellation = await dependencies.cancel(triggerCancellation(input, reminder));
      canceled += cancellation.canceled;
      continue;
    }

    const result = await dependencies.request({
      template: "pr.confirmation-reminder",
      recipientUserId: input.recipientUserId,
      channel: "WECHAT_SUBSCRIPTION",
      payload: {
        prId: input.prId,
        slotId: input.slotId,
        reminder,
      },
      metadata: {
        aggregate: aggregateFor(input.prId),
        causationId: `partner_request:${input.prId}:confirmation-reminder:${input.slotId}:${reminder}`,
      },
    });
    if (result.creation !== "CANCELED") requested.push(reminder);
  }

  return { requested, canceled };
};

/** Recipient rebuild invalidates stale work before enumerating current slots. */
export const reconcileConfirmationRemindersForRecipient = async (
  input: { recipientUserId: UserId },
  dependencies: ConfirmationReminderReconcilerDependencies = defaultDependencies,
): Promise<ConfirmationReminderRecipientReconciliationResult> => {
  const cancellation = await dependencies.cancel({
    template: "pr.confirmation-reminder",
    recipientUserId: input.recipientUserId,
    scope: { kind: "RECIPIENT" },
  });
  const participations = await dependencies.listCurrentParticipations(input.recipientUserId);
  const unique = new Map<string, { prId: PRId; slotId: PartnerId }>();
  for (const participation of participations) {
    unique.set(`${participation.prId}:${participation.slotId}`, participation);
  }

  for (const participation of unique.values()) {
    await reconcileConfirmationRemindersForParticipant(
      { ...participation, recipientUserId: input.recipientUserId },
      dependencies,
    );
  }

  return { canceled: cancellation.canceled, reconciled: [...unique.values()] };
};
