import {
  createNotificationOwner,
  type NotificationOwner,
} from "../../domains/notification/owner/notification-owner.service";
import type {
  NotificationChannelPort,
  NotificationDispatchContextPort,
  NotificationOptionPort,
  NotificationSchedulingContextPort,
  NotificationTaskSchedulerPort,
  NotificationWindowAcknowledgementPort,
  NotificationWindowInvalidationPort,
} from "../../domains/notification/owner/ports";
import { configureNotificationOwner } from "../../domains/notification/owner/runtime";
import { notificationTaskPayloadSchema } from "../../domains/notification/owner/task";
import {
  createNotificationOncePerCauseSchedulerAdapter,
  createNotificationWindowAcknowledgementAdapter,
  createNotificationWindowInvalidationAdapter,
  notificationSendJobIdentity,
} from "../../domains/notification/transaction";
import { clearPRMessageNotificationPermission } from "../../domains/notification/pr-message-subscription";
import {
  getActivityStartReminderNotificationContext,
  getActivityStartReminderSchedulingContext,
  getConfirmationReminderNotificationContext,
  getConfirmationReminderSchedulingContext,
  getMeetingPointUpdatedNotificationContext,
  getNewPartnerNotificationContext,
  getPRMessageSummaryNotificationContext,
  getPRReadyNotificationContext,
  getWaitlistAlternativeAvailableNotificationContext,
  getWaitlistPromotedNotificationContext,
} from "../../domains/pr/notification-contexts";
import { env } from "../../lib/env";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../repositories/UserRepository";
import { jobRunner } from "../jobs";
import { createWeChatSubscriptionPreparedNotificationChannel } from "./channels";

const ACTIVITY_START_REMINDER_NOTIFICATION_KIND = "ACTIVITY_START_REMINDER" as const;
const WAITLIST_PROMOTED_NOTIFICATION_KIND = "WAITLIST_PROMOTED" as const;
const CONFIRMATION_REMINDER_NOTIFICATION_KIND = "REMINDER_CONFIRMATION" as const;
const NEW_PARTNER_NOTIFICATION_KIND = "NEW_PARTNER" as const;
const MEETING_POINT_UPDATED_NOTIFICATION_KIND = "MEETING_POINT_UPDATED" as const;
const PR_READY_NOTIFICATION_KIND = "PR_READY" as const;
const WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND = "WAITLIST_ALTERNATIVE_AVAILABLE" as const;

const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();

const defaultOncePerCauseScheduler = createNotificationOncePerCauseSchedulerAdapter(jobRunner);
const defaultWindowInvalidation: NotificationWindowInvalidationPort =
  createNotificationWindowInvalidationAdapter(jobRunner);
const defaultWindowAcknowledgement: NotificationWindowAcknowledgementPort =
  createNotificationWindowAcknowledgementAdapter(jobRunner);
const defaultChannel = createWeChatSubscriptionPreparedNotificationChannel();

const resolvePrUrl = (prId: number): string | null => {
  const frontendUrl = env.FRONTEND_URL?.trim();
  if (!frontendUrl) return null;
  try {
    const url = new URL(frontendUrl);
    url.pathname = `/pr/${prId}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

const resolveApplicantName = (nickname: string | null): string => {
  const normalized = nickname?.trim();
  return normalized || "新搭子";
};

const scheduler: NotificationTaskSchedulerPort = {
  enqueueOncePerCause: defaultOncePerCauseScheduler.enqueueOncePerCause,

  async replaceActive(input) {
    const result = await jobRunner.replacePendingByDedupe({
      jobType: notificationSendJobIdentity.type,
      jobVersion: notificationSendJobIdentity.version,
      runAt: input.runAt,
      resolutionMs: input.timing.resolutionMs,
      earlyToleranceUnits: input.timing.earlyToleranceUnits,
      lateToleranceUnits: input.timing.lateToleranceUnits,
      coordinationKey: input.coordinationKey,
      activeKeyPrefix: input.activeKeyPrefix,
      scheduleKey: input.scheduleKey,
      payload: input.task,
    });
    return { creation: result.inserted ? "CREATED" : "COALESCED" };
  },

  cancelActive(input) {
    return jobRunner.cancelPendingByDedupeSerialized({
      jobType: notificationSendJobIdentity.type,
      coordinationKey: input.coordinationKey,
      activeKeyPrefix: input.activeKeyPrefix,
    });
  },
};

const options: NotificationOptionPort = {
  async load(input) {
    const opt = await userNotificationOptRepo.findByUserId(input.recipientUserId);
    if (input.template === "pr.activity-start-reminder") {
      return {
        preferred: opt?.wechatActivityStartReminderOptIn ?? false,
        credit: {
          kind: "LIMITED",
          remaining: opt?.wechatActivityStartReminderRemainingCount ?? 0,
        },
      };
    }
    if (input.template === "pr.meeting-point-updated") {
      return {
        preferred: opt?.wechatMeetingPointUpdatedOptIn ?? false,
        credit: {
          kind: "LIMITED",
          remaining: opt?.wechatMeetingPointUpdatedRemainingCount ?? 0,
        },
      };
    }
    if (input.template === "pr.new-partner") {
      return {
        preferred: opt?.wechatNewPartnerOptIn ?? false,
        credit: {
          kind: "LIMITED",
          remaining: opt?.wechatNewPartnerRemainingCount ?? 0,
        },
      };
    }
    if (input.template === "pr.ready") {
      return {
        preferred: opt?.wechatPrReadyOptIn ?? false,
        credit: {
          kind: "LIMITED",
          remaining: opt?.wechatPrReadyRemainingCount ?? 0,
        },
      };
    }
    if (input.template === "pr.message-summary") {
      return {
        preferred: opt?.wechatPrMessageOptIn ?? false,
        credit: {
          kind: "LIMITED",
          remaining: opt?.wechatPrMessageRemainingCount ?? 0,
        },
      };
    }
    if (input.template === "pr.waitlist-alternative-available") {
      return {
        preferred: opt?.wechatWaitlistAlternativeAvailableOptIn ?? false,
        credit: {
          kind: "LIMITED",
          remaining: opt?.wechatWaitlistAlternativeAvailableRemainingCount ?? 0,
        },
      };
    }
    if (input.template !== "pr.waitlist-promoted") {
      if (input.template !== "pr.confirmation-reminder") {
        throw new Error("NOTIFICATION_TEMPLATE_NOT_ENABLED");
      }
      return {
        preferred: opt?.wechatReminderOptIn ?? false,
        credit: {
          kind: "LIMITED",
          remaining: opt?.wechatReminderRemainingCount ?? 0,
        },
      };
    }
    return {
      preferred: opt?.wechatWaitlistPromotedOptIn ?? false,
      credit: {
        kind: "LIMITED",
        remaining: opt?.wechatWaitlistPromotedRemainingCount ?? 0,
      },
    };
  },

  async consumeLimitedCredit(input) {
    const result =
      input.template === "pr.activity-start-reminder"
        ? await userNotificationOptRepo.consumeOneWechatActivityStartReminderCreditPreservingPreference(
            input.recipientUserId,
          )
        : input.template === "pr.message-summary"
          ? await userNotificationOptRepo.consumeOneWechatPRMessageCreditPreservingPreference(
              input.recipientUserId,
            )
          : input.template === "pr.waitlist-promoted"
            ? await userNotificationOptRepo.consumeOneWechatWaitlistPromotedCreditPreservingPreference(
                input.recipientUserId,
              )
            : input.template === "pr.new-partner"
              ? await userNotificationOptRepo.consumeOneWechatNewPartnerCreditPreservingPreference(
                  input.recipientUserId,
                )
              : input.template === "pr.meeting-point-updated"
                ? await userNotificationOptRepo.consumeOneWechatMeetingPointUpdatedCreditPreservingPreference(
                    input.recipientUserId,
                  )
                : input.template === "pr.ready"
                  ? await userNotificationOptRepo.consumeOneWechatPRReadyCreditPreservingPreference(
                      input.recipientUserId,
                    )
                  : input.template === "pr.waitlist-alternative-available"
                    ? await userNotificationOptRepo.consumeOneWechatWaitlistAlternativeAvailableCreditPreservingPreference(
                        input.recipientUserId,
                      )
                    : input.template === "pr.confirmation-reminder"
                      ? await userNotificationOptRepo.consumeOneWechatReminderCreditPreservingPreference(
                          input.recipientUserId,
                        )
                      : null;
    if (!result) {
      throw new Error("NOTIFICATION_TEMPLATE_NOT_ENABLED");
    }
    return { consumed: result.consumed, remaining: result.remainingCount };
  },

  async clearRecipientPermission(input) {
    if (input.template === "pr.message-summary") {
      await clearPRMessageNotificationPermission({ recipientUserId: input.recipientUserId });
      return;
    }
    const kind =
      input.template === "pr.activity-start-reminder"
        ? ACTIVITY_START_REMINDER_NOTIFICATION_KIND
        : input.template === "pr.waitlist-promoted"
          ? WAITLIST_PROMOTED_NOTIFICATION_KIND
          : input.template === "pr.new-partner"
            ? NEW_PARTNER_NOTIFICATION_KIND
            : input.template === "pr.meeting-point-updated"
              ? MEETING_POINT_UPDATED_NOTIFICATION_KIND
              : input.template === "pr.ready"
                ? PR_READY_NOTIFICATION_KIND
                : input.template === "pr.waitlist-alternative-available"
                  ? WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND
                  : input.template === "pr.confirmation-reminder"
                    ? CONFIRMATION_REMINDER_NOTIFICATION_KIND
                    : null;
    if (!kind) {
      throw new Error("NOTIFICATION_TEMPLATE_NOT_ENABLED");
    }
    await userNotificationOptRepo.clearWechatNotificationCredits(input.recipientUserId, kind);
  },
};

const schedulingContexts: NotificationSchedulingContextPort = {
  resolveActivityStartReminder: getActivityStartReminderSchedulingContext,
  resolveConfirmationReminder: getConfirmationReminderSchedulingContext,
};

const contexts: NotificationDispatchContextPort = {
  async resolveActivityStartReminder(task) {
    const [recipient, prContext] = await Promise.all([
      userRepo.findById(task.recipientUserId),
      getActivityStartReminderNotificationContext({
        prId: task.payload.prId,
        recipientUserId: task.recipientUserId,
      }),
    ]);

    if (!recipient || recipient.status !== "ACTIVE") {
      return { state: "SKIPPED", reason: "USER_INACTIVE_OR_MISSING" };
    }
    if (!recipient.openId) {
      return { state: "SKIPPED", reason: "USER_OPENID_MISSING" };
    }
    if (prContext.state === "SKIPPED") {
      return prContext;
    }

    return {
      state: "READY",
      recipientChannelAddress: recipient.openId,
      activityStartAt: prContext.activityStartAt,
      activityName: prContext.activityName,
      location: prContext.location,
      page: resolvePrUrl(task.payload.prId),
    };
  },

  async resolveWaitlistPromoted(task) {
    const [recipient, prContext] = await Promise.all([
      userRepo.findById(task.recipientUserId),
      getWaitlistPromotedNotificationContext({
        prId: task.payload.prId,
        partnerId: task.payload.partnerId,
        recipientUserId: task.recipientUserId,
        waitlistCycleId: task.payload.waitlistCycleId,
      }),
    ]);

    if (!recipient || recipient.status !== "ACTIVE") {
      return { state: "SKIPPED", reason: "USER_INACTIVE_OR_MISSING" };
    }
    if (!recipient.openId) {
      return { state: "SKIPPED", reason: "USER_OPENID_MISSING" };
    }
    if (prContext.state === "SKIPPED") {
      return prContext;
    }

    return {
      state: "READY",
      recipientChannelAddress: recipient.openId,
      title: prContext.title,
      page: resolvePrUrl(task.payload.prId),
    };
  },

  async resolveWaitlistAlternativeAvailable(task) {
    const recipient = await userRepo.findById(task.recipientUserId);

    if (!recipient || recipient.status !== "ACTIVE") {
      return { state: "SKIPPED", reason: "USER_INACTIVE_OR_MISSING" };
    }
    if (!recipient.openId) {
      return { state: "SKIPPED", reason: "USER_OPENID_MISSING" };
    }

    const prContext = await getWaitlistAlternativeAvailableNotificationContext({
      sourcePrId: task.payload.sourcePrId,
      sourcePartnerId: task.payload.sourcePartnerId,
      sourceWaitlistCycleId: task.payload.sourceWaitlistCycleId,
      candidatePrId: task.payload.candidatePrId,
      recipientUserId: task.recipientUserId,
    });
    if (prContext.state === "SKIPPED") {
      return prContext;
    }

    return {
      state: "READY",
      recipientChannelAddress: recipient.openId,
      title: prContext.title,
      page: resolvePrUrl(task.payload.candidatePrId),
    };
  },

  async resolveNewPartner(task) {
    const [recipient, joinedUser, prContext] = await Promise.all([
      userRepo.findById(task.recipientUserId),
      userRepo.findById(task.payload.joinedUserId),
      getNewPartnerNotificationContext({
        prId: task.payload.prId,
        partnerId: task.payload.partnerId,
        joinedUserId: task.payload.joinedUserId,
        recipientUserId: task.recipientUserId,
        admissionCycleId: task.payload.admissionCycleId,
      }),
    ]);

    if (!recipient || recipient.status !== "ACTIVE") {
      return { state: "SKIPPED", reason: "USER_INACTIVE_OR_MISSING" };
    }
    if (!recipient.openId) {
      return { state: "SKIPPED", reason: "USER_OPENID_MISSING" };
    }
    if (prContext.state === "SKIPPED") {
      return prContext;
    }

    return {
      state: "READY",
      recipientChannelAddress: recipient.openId,
      applicantName: resolveApplicantName(joinedUser?.nickname ?? null),
      teamName: prContext.teamName,
      page: resolvePrUrl(task.payload.prId),
    };
  },

  async resolveMeetingPointUpdated(task) {
    const [recipient, prContext] = await Promise.all([
      userRepo.findById(task.recipientUserId),
      getMeetingPointUpdatedNotificationContext({
        prId: task.payload.prId,
        recipientUserId: task.recipientUserId,
      }),
    ]);

    if (!recipient || recipient.status !== "ACTIVE") {
      return { state: "SKIPPED", reason: "USER_INACTIVE_OR_MISSING" };
    }
    if (!recipient.openId) {
      return { state: "SKIPPED", reason: "USER_OPENID_MISSING" };
    }
    if (prContext.state === "SKIPPED") {
      return prContext;
    }

    return {
      state: "READY",
      recipientChannelAddress: recipient.openId,
      page: resolvePrUrl(task.payload.prId),
    };
  },

  async resolvePRReady(task) {
    const [recipient, prContext] = await Promise.all([
      userRepo.findById(task.recipientUserId),
      getPRReadyNotificationContext({
        prId: task.payload.prId,
        recipientUserId: task.recipientUserId,
        readyCycleId: task.payload.readyCycleId,
      }),
    ]);

    if (!recipient || recipient.status !== "ACTIVE") {
      return { state: "SKIPPED", reason: "USER_INACTIVE_OR_MISSING" };
    }
    if (!recipient.openId) {
      return { state: "SKIPPED", reason: "USER_OPENID_MISSING" };
    }
    if (prContext.state === "SKIPPED") {
      return prContext;
    }

    return {
      state: "READY",
      recipientChannelAddress: recipient.openId,
      title: prContext.title,
      type: prContext.type,
      page: resolvePrUrl(task.payload.prId),
    };
  },

  async resolvePRMessageSummary(task, input) {
    const [recipient, prContext] = await Promise.all([
      userRepo.findById(task.recipientUserId),
      getPRMessageSummaryNotificationContext({
        prId: task.payload.prId,
        recipientUserId: task.recipientUserId,
        windowStartCursor: input.windowStartCursor,
      }),
    ]);

    if (!recipient || recipient.status !== "ACTIVE") {
      return { state: "SKIPPED", reason: "USER_INACTIVE_OR_MISSING" };
    }
    if (!recipient.openId) {
      return { state: "SKIPPED", reason: "USER_OPENID_MISSING" };
    }
    if (prContext.state === "SKIPPED") {
      return prContext;
    }

    return {
      state: "READY",
      recipientChannelAddress: recipient.openId,
      threadTitle: prContext.threadTitle,
      authorName: prContext.authorName,
      sentAt: prContext.sentAt,
      messageSummary: prContext.messageSummary,
      page: resolvePrUrl(task.payload.prId),
    };
  },

  async resolveConfirmationReminder(task) {
    const [recipient, prContext] = await Promise.all([
      userRepo.findById(task.recipientUserId),
      getConfirmationReminderNotificationContext({
        prId: task.payload.prId,
        slotId: task.payload.slotId,
        recipientUserId: task.recipientUserId,
      }),
    ]);

    if (!recipient || recipient.status !== "ACTIVE") {
      return { state: "SKIPPED", reason: "USER_INACTIVE_OR_MISSING" };
    }
    if (!recipient.openId) {
      return { state: "SKIPPED", reason: "USER_OPENID_MISSING" };
    }
    if (prContext.state === "SKIPPED") {
      return prContext;
    }

    return {
      state: "READY",
      recipientChannelAddress: recipient.openId,
      confirmationStartAt: prContext.confirmationStartAt,
      confirmationEndAt: prContext.confirmationEndAt,
      title: prContext.title,
      activityStartAt: prContext.activityStartAt,
      page: resolvePrUrl(task.payload.prId),
    };
  },
};

let owner: NotificationOwner | null = null;
let genericJobRegistered = false;

/**
 * Concrete composition boundary for the migrated generic Notification Job.
 * Tests may substitute only the neutral channel port while keeping the real
 * Job scheduler, option repository, and curated PR context adapter intact.
 */
export const createNotificationOwnerRuntime = (
  input: {
    channel?: NotificationChannelPort;
    now?: () => Date;
  } = {},
): NotificationOwner =>
  createNotificationOwner({
    scheduler,
    windowInvalidation: defaultWindowInvalidation,
    windowAcknowledgement: defaultWindowAcknowledgement,
    options,
    schedulingContexts,
    contexts,
    channel: input.channel ?? defaultChannel,
    now: input.now,
  });

const getOrCreateOwner = (): NotificationOwner => {
  if (!owner) {
    owner = createNotificationOwnerRuntime();
  }
  return owner;
};

/** Composition owns both concrete adapters and generic Job registration. */
export const registerNotificationSendJobs = (): void => {
  const notificationOwner = getOrCreateOwner();
  configureNotificationOwner(notificationOwner);
  if (genericJobRegistered) {
    return;
  }

  jobRunner.registerDefinition({
    jobType: notificationSendJobIdentity.type,
    version: notificationSendJobIdentity.version,
    payloadSchema: notificationTaskPayloadSchema,
    execute: (payload, context) => notificationOwner.dispatch(payload, context),
  });
  genericJobRegistered = true;
};
