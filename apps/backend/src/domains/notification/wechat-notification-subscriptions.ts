import type { UserId } from "../../entities/user";
import type { WeChatNotificationKind } from "../../entities/user-notification-opt";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import { getNotificationOwner } from "./owner/runtime";
import { updatePRMessageNotificationSubscription } from "./pr-message-subscription";

export const weChatNotificationSubscriptionKinds = [
  "REMINDER_CONFIRMATION",
  "ACTIVITY_START_REMINDER",
  "NEW_PARTNER",
  "MEETING_POINT_UPDATED",
  "PR_READY",
  "WAITLIST_PROMOTED",
  "WAITLIST_ALTERNATIVE_AVAILABLE",
  "PR_MESSAGE",
] as const satisfies readonly WeChatNotificationKind[];

export type WeChatNotificationSubscriptionKind =
  (typeof weChatNotificationSubscriptionKinds)[number];
export type WeChatNotificationSubscriptionAction = "ADD_ONE" | "CLEAR";

export type WeChatNotificationSubscription = {
  enabled: boolean;
  optInAt: string | null;
  remainingCount: number;
};

export type WeChatNotificationSubscriptions = Record<
  WeChatNotificationSubscriptionKind,
  WeChatNotificationSubscription
>;

export type WeChatNotificationSubscriptionMutationResult = WeChatNotificationSubscription & {
  deletedJobs: number;
};

export type WeChatNotificationSubscriptionUpdateResult =
  WeChatNotificationSubscriptionMutationResult & {
    kind: WeChatNotificationSubscriptionKind;
    action: WeChatNotificationSubscriptionAction;
  };

export type WeChatNotificationSubscriptionReconciliationPort = {
  reconcileConfirmationRemindersForRecipient(input: {
    recipientUserId: UserId;
  }): Promise<{ canceled: number }>;
  reconcileActivityStartRemindersForRecipient(input: {
    recipientUserId: UserId;
  }): Promise<{ canceled: number }>;
  reconcileAlternativeWaitlistNotificationsForUserSources(userId: UserId): Promise<unknown>;
};

export type WeChatNotificationSubscriptionCommands = {
  update(input: {
    userId: UserId;
    kind: WeChatNotificationSubscriptionKind;
    action: WeChatNotificationSubscriptionAction;
  }): Promise<WeChatNotificationSubscriptionUpdateResult>;
  setConfirmation(input: {
    userId: UserId;
    enabled: boolean;
  }): Promise<WeChatNotificationSubscriptionMutationResult>;
};

const notificationOptRepo = new UserNotificationOptRepository();

const toSubscription = (snapshot: {
  enabled: boolean;
  optInAt: Date | null;
  remainingCount: number;
}): WeChatNotificationSubscription => ({
  enabled: snapshot.enabled,
  optInAt: snapshot.optInAt?.toISOString() ?? null,
  remainingCount: snapshot.remainingCount,
});

const readSubscription = async (
  userId: UserId,
  kind: WeChatNotificationSubscriptionKind,
): Promise<WeChatNotificationSubscription> => {
  const option = await notificationOptRepo.findByUserId(userId);
  return toSubscription(notificationOptRepo.getSubscriptionSnapshot(option, kind));
};

export const getWeChatNotificationSubscriptions = async (
  userId: UserId,
): Promise<WeChatNotificationSubscriptions> => {
  const option = await notificationOptRepo.findByUserId(userId);
  const read = (kind: WeChatNotificationSubscriptionKind) =>
    toSubscription(notificationOptRepo.getSubscriptionSnapshot(option, kind));

  return {
    REMINDER_CONFIRMATION: read("REMINDER_CONFIRMATION"),
    ACTIVITY_START_REMINDER: read("ACTIVITY_START_REMINDER"),
    NEW_PARTNER: read("NEW_PARTNER"),
    MEETING_POINT_UPDATED: read("MEETING_POINT_UPDATED"),
    PR_READY: read("PR_READY"),
    WAITLIST_PROMOTED: read("WAITLIST_PROMOTED"),
    WAITLIST_ALTERNATIVE_AVAILABLE: read("WAITLIST_ALTERNATIVE_AVAILABLE"),
    PR_MESSAGE: read("PR_MESSAGE"),
  };
};

const applySubscriptionSideEffects = async (
  input: {
    userId: UserId;
    kind: WeChatNotificationSubscriptionKind;
    previousRemainingCount: number;
    nextRemainingCount: number;
  },
  reconciliationPort: WeChatNotificationSubscriptionReconciliationPort,
): Promise<number> => {
  if (input.kind === "REMINDER_CONFIRMATION") {
    if (input.nextRemainingCount <= 0) {
      const cancellation = await getNotificationOwner().cancel({
        template: "pr.confirmation-reminder",
        recipientUserId: input.userId,
        scope: { kind: "RECIPIENT" },
      });
      return cancellation.canceled;
    }

    const reconciliation = await reconciliationPort.reconcileConfirmationRemindersForRecipient({
      recipientUserId: input.userId,
    });
    return reconciliation.canceled;
  }

  if (input.kind === "ACTIVITY_START_REMINDER") {
    if (input.nextRemainingCount <= 0) {
      const cancellation = await getNotificationOwner().cancel({
        template: "pr.activity-start-reminder",
        recipientUserId: input.userId,
        scope: { kind: "RECIPIENT" },
      });
      return cancellation.canceled;
    }

    const reconciliation = await reconciliationPort.reconcileActivityStartRemindersForRecipient({
      recipientUserId: input.userId,
    });
    return reconciliation.canceled;
  }

  if (
    input.kind === "WAITLIST_ALTERNATIVE_AVAILABLE" &&
    input.previousRemainingCount <= 0 &&
    input.nextRemainingCount > 0
  ) {
    await reconciliationPort.reconcileAlternativeWaitlistNotificationsForUserSources(input.userId);
  }

  return 0;
};

export const createWeChatNotificationSubscriptionCommands = (input: {
  reconciliationPort: WeChatNotificationSubscriptionReconciliationPort;
}): WeChatNotificationSubscriptionCommands => {
  const update: WeChatNotificationSubscriptionCommands["update"] = async (command) => {
    if (command.kind === "PR_MESSAGE") {
      const subscriptionUpdate = await updatePRMessageNotificationSubscription({
        recipientUserId: command.userId,
        action: command.action,
      });
      const subscription = await readSubscription(command.userId, command.kind);
      return {
        kind: command.kind,
        action: command.action,
        enabled: subscriptionUpdate.current.preferred,
        optInAt: subscription.optInAt,
        remainingCount: subscriptionUpdate.current.remainingCredit,
        deletedJobs: subscriptionUpdate.invalidated.canceled,
      };
    }

    const previousOption = await notificationOptRepo.findByUserId(command.userId);
    const previous = notificationOptRepo.getSubscriptionSnapshot(previousOption, command.kind);
    const updatedOption =
      command.action === "ADD_ONE"
        ? await notificationOptRepo.addOneWechatNotificationCredit(command.userId, command.kind)
        : await notificationOptRepo.clearWechatNotificationCredits(command.userId, command.kind);
    if (!updatedOption) {
      throw new Error("WECHAT_NOTIFICATION_SUBSCRIPTION_WRITE_FAILED");
    }

    const current = notificationOptRepo.getSubscriptionSnapshot(updatedOption, command.kind);
    const deletedJobs = await applySubscriptionSideEffects(
      {
        userId: command.userId,
        kind: command.kind,
        previousRemainingCount: previous.remainingCount,
        nextRemainingCount: current.remainingCount,
      },
      input.reconciliationPort,
    );
    return {
      kind: command.kind,
      action: command.action,
      ...toSubscription(current),
      deletedJobs,
    };
  };

  const setConfirmation: WeChatNotificationSubscriptionCommands["setConfirmation"] = async (
    command,
  ) => {
    const kind = "REMINDER_CONFIRMATION" as const;
    const previousOption = await notificationOptRepo.findByUserId(command.userId);
    const previous = notificationOptRepo.getSubscriptionSnapshot(previousOption, kind);
    const updatedOption = await notificationOptRepo.setWechatNotificationRemainingCount(
      command.userId,
      kind,
      command.enabled ? 1 : 0,
    );
    if (!updatedOption) {
      throw new Error("WECHAT_NOTIFICATION_SUBSCRIPTION_WRITE_FAILED");
    }

    const current = notificationOptRepo.getSubscriptionSnapshot(updatedOption, kind);
    const deletedJobs = await applySubscriptionSideEffects(
      {
        userId: command.userId,
        kind,
        previousRemainingCount: previous.remainingCount,
        nextRemainingCount: current.remainingCount,
      },
      input.reconciliationPort,
    );
    return {
      ...toSubscription(current),
      deletedJobs,
    };
  };

  return { update, setConfirmation };
};
