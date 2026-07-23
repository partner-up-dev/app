import { createTransactionBoundJobWriter } from "../../infra/jobs";
import type { JobTransactionWriter } from "../../infra/jobs/contracts";
import type { PRMessageId } from "../../entities/pr-message";
import type { AdmissionCycleId, PartnerId } from "../../entities/partner";
import type { PRId, PRReadyCycleId } from "../../entities/partner-request";
import type { UserId } from "../../entities/user";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../repositories/UserRepository";
import type { TransactionExecutor } from "../../repositories/_executor";
import type {
  NotificationTaskSchedulerPort,
  NotificationUntilAcknowledgedTaskSchedulerPort,
  NotificationWindowAcknowledgementPort,
  NotificationWindowInvalidationPort,
} from "./owner/ports";
import { getNotificationOwner } from "./owner/runtime";
import { requestPRMessageSummaryNotification } from "./owner/notification-owner.service";
import {
  prMessageSummaryCreationKey,
  prMessageSummaryCreationKeyPrefix,
} from "./owner/pr-message-window";
import type { NotificationInvalidationResult } from "./contracts";
import {
  createNewPartnerNotificationSchedulerPort,
  type NewPartnerNotificationSchedulerPort,
} from "./owner/new-partner-notification";
import {
  createMeetingPointUpdatedNotificationSchedulerPort,
  type MeetingPointUpdatedNotificationSchedulerPort,
} from "./owner/meeting-point-updated-notification";
import {
  createPRReadyNotificationSchedulerPort,
  type PRReadyNotificationSchedulerPort,
} from "./owner/pr-ready-notification";
import {
  createWaitlistPromotionNotificationPort,
  type WaitlistPromotionNotificationPort,
} from "./owner/waitlist-promotion-notification";

export const notificationSendJobIdentity = {
  type: "notification.send.v1",
  version: 1,
} as const;

type OncePerCauseJobWriter = Pick<JobTransactionWriter, "scheduleOncePerCause">;
type UntilAcknowledgedJobWriter = Pick<JobTransactionWriter, "scheduleUntilAcknowledged">;
type HeldReservationReleaseJobWriter = Pick<
  JobTransactionWriter,
  "releaseHeldReservation" | "releaseHeldReservationsByCreationKeyPrefix"
>;
type HeldReservationAcknowledgementJobWriter = Pick<
  JobTransactionWriter,
  "acknowledgeUntilAcknowledged"
>;

export type NewPartnerNotificationPort = {
  requestForSourceRecipients(input: {
    prId: PRId;
    partnerId: PartnerId;
    joinedUserId: UserId;
    joinedAtIso: string;
    admissionCycleId: AdmissionCycleId;
    activeRecipientCandidateUserIds: readonly UserId[];
  }): Promise<{ recipientUserIds: UserId[] }>;
};

export type PRReadyNotificationPort = {
  requestForSourceRecipients(input: {
    prId: PRId;
    readyCycleId: PRReadyCycleId;
    activeRecipientCandidateUserIds: readonly UserId[];
  }): Promise<{ recipientUserIds: UserId[] }>;
};

export type MeetingPointUpdatedNotificationPort = {
  requestForSourceRecipients(input: {
    prId: PRId;
    meetingPointUpdateId: string;
    meetingPointDescription: string;
    updatedAtIso: string;
    correlationId?: string;
    activeRecipientCandidateUserIds: readonly UserId[];
  }): Promise<{ recipientUserIds: UserId[] }>;
};

/**
 * Curated source-time handoff for a PR message. The source supplies a frozen
 * active roster from its own transaction; Notification owns provider
 * availability, notification eligibility and the private Job reservation.
 */
export type PRMessageSummaryNotificationPort = {
  requestForSourceRecipients(input: {
    prId: PRId;
    authorUserId: UserId;
    windowStartCursor: PRMessageId;
    windowOpenedAt: Date;
    activeRecipientCandidateUserIds: readonly UserId[];
  }): Promise<{ recipientUserIds: UserId[] }>;
};

/**
 * A caller-owned Notification transaction can stop message attention without
 * observing Job identities or opaque creation keys. This is intentionally
 * narrower than the runtime owner command because source state and release
 * must commit together.
 */
export type PRMessageSummaryNotificationInvalidationPort = {
  invalidateForRecipientAndAggregate(input: {
    prId: PRId;
    recipientUserId: UserId;
  }): Promise<NotificationInvalidationResult>;
  invalidateForRecipient(input: {
    recipientUserId: UserId;
  }): Promise<NotificationInvalidationResult>;
};

/**
 * Notification-owned Job mapping shared by the ordinary runtime scheduler and
 * named transaction-bound integrations. Not re-exported by the domain root.
 */
export const createNotificationOncePerCauseSchedulerAdapter = (
  writer: OncePerCauseJobWriter,
): Pick<NotificationTaskSchedulerPort, "enqueueOncePerCause"> => ({
  async enqueueOncePerCause(input) {
    const result = await writer.scheduleOncePerCause({
      jobType: notificationSendJobIdentity.type,
      jobVersion: notificationSendJobIdentity.version,
      runAt: input.runAt,
      resolutionMs: input.timing.resolutionMs,
      earlyToleranceUnits: input.timing.earlyToleranceUnits,
      lateToleranceUnits: input.timing.lateToleranceUnits,
      creationKey: input.creationKey,
      payload: input.task,
    });
    return { creation: result.inserted ? "CREATED" : "COALESCED" };
  },
});

/**
 * Private generic Job mapping for held attention windows. The PR source sees
 * neither a Job type/version nor the timing details that define the window.
 */
export const createNotificationUntilAcknowledgedSchedulerAdapter = (
  writer: UntilAcknowledgedJobWriter,
): NotificationUntilAcknowledgedTaskSchedulerPort => ({
  async enqueueUntilAcknowledged(input) {
    const result = await writer.scheduleUntilAcknowledged({
      jobType: notificationSendJobIdentity.type,
      jobVersion: notificationSendJobIdentity.version,
      runAt: input.runAt,
      resolutionMs: input.timing.resolutionMs,
      earlyToleranceUnits: input.timing.earlyToleranceUnits,
      lateToleranceUnits: input.timing.lateToleranceUnits,
      creationKey: input.creationKey,
      windowStartCursor: input.windowStartCursor,
      highWaterCursor: input.highWaterCursor,
      payload: input.task,
    });
    return { creation: result.inserted ? "CREATED" : "COALESCED" };
  },
});

/**
 * Notification owns the generic Job identity for every prepared send. The
 * resulting adapter intentionally exposes only opaque creation-key control to
 * the Notification owner; neither PR nor provider code can reach Job rows.
 */
export const createNotificationWindowInvalidationAdapter = (
  writer: HeldReservationReleaseJobWriter,
): NotificationWindowInvalidationPort => ({
  releaseHeldReservation: ({ creationKey }) =>
    writer.releaseHeldReservation({
      jobType: notificationSendJobIdentity.type,
      creationKey,
    }),
  releaseHeldReservationsByCreationKeyPrefix: ({ creationKeyPrefix }) =>
    writer.releaseHeldReservationsByCreationKeyPrefix({
      jobType: notificationSendJobIdentity.type,
      creationKeyPrefix,
    }),
});

/**
 * Private generic Job mapping for semantic attention acknowledgement. The
 * caller supplies an opaque Notification creation identity, never a Job type
 * or Job key construction rule.
 */
export const createNotificationWindowAcknowledgementAdapter = (
  writer: HeldReservationAcknowledgementJobWriter,
): NotificationWindowAcknowledgementPort => ({
  acknowledgeHeldReservation: ({ creationKey, throughCursor }) =>
    writer.acknowledgeUntilAcknowledged({
      jobType: notificationSendJobIdentity.type,
      creationKey,
      throughCursor,
    }),
});

/**
 * Maps PR facts to Notification's private message-window identity while the
 * caller still owns the encompassing database transaction.
 */
export const createPRMessageSummaryNotificationInvalidationAdapter = (
  writer: HeldReservationReleaseJobWriter,
): PRMessageSummaryNotificationInvalidationPort => {
  const invalidation = createNotificationWindowInvalidationAdapter(writer);

  return {
    async invalidateForRecipientAndAggregate({ prId, recipientUserId }) {
      const result = await invalidation.releaseHeldReservation({
        creationKey: prMessageSummaryCreationKey({ recipientUserId, prId }),
      });
      return {
        released: result.released ? 1 : 0,
        canceled: result.canceled ? 1 : 0,
      };
    },

    async invalidateForRecipient({ recipientUserId }) {
      const result = await invalidation.releaseHeldReservationsByCreationKeyPrefix({
        creationKeyPrefix: prMessageSummaryCreationKeyPrefix(recipientUserId),
      });
      return { released: result.released, canceled: result.canceled };
    },
  };
};

/**
 * Curated transaction-bound message-window release. Callers provide only
 * their transaction executor and semantic PR/recipient facts; Notification
 * keeps the Job writer and private creation identity behind this boundary.
 */
export const createTransactionBoundPRMessageSummaryNotificationInvalidationPort = (input: {
  executor: TransactionExecutor;
}): PRMessageSummaryNotificationInvalidationPort =>
  createPRMessageSummaryNotificationInvalidationAdapter(
    createTransactionBoundJobWriter(input.executor),
  );

/**
 * Notification-private writer seam for focused mapping tests. Source domains
 * consume the executor-facing factory below instead.
 */
export const createWaitlistPromotionNotificationPortWithWriter = (
  writer: OncePerCauseJobWriter,
): WaitlistPromotionNotificationPort =>
  createWaitlistPromotionNotificationPort({
    scheduler: createNotificationOncePerCauseSchedulerAdapter(writer),
  });

/**
 * Curated PR/Notification integration for an atomic waitlist promotion. The
 * caller supplies only its transaction executor; Notification binds its own
 * scheduling adapter to that exact transaction.
 */
export const createTransactionBoundWaitlistPromotionNotificationPort = (input: {
  executor: TransactionExecutor;
}): WaitlistPromotionNotificationPort =>
  createWaitlistPromotionNotificationPortWithWriter(
    createTransactionBoundJobWriter(input.executor),
  );

/**
 * Curated PR/Notification handoff for one active admission. PR supplies only
 * its transaction-local active roster and immutable admission facts. This
 * adapter owns Notification's source-time recipient eligibility and the
 * private per-recipient Job policy without exposing a generic transaction API.
 */
export const createNewPartnerNotificationPortWithWriter = (input: {
  writer: OncePerCauseJobWriter;
  executor: TransactionExecutor;
}): NewPartnerNotificationPort => {
  const userRepo = new UserRepository(input.executor);
  const notificationOptRepo = new UserNotificationOptRepository();
  const scheduler = createNotificationOncePerCauseSchedulerAdapter(input.writer);

  return {
    async requestForSourceRecipients(request) {
      const candidateUserIds = Array.from(
        new Set(
          request.activeRecipientCandidateUserIds.filter(
            (userId) => userId !== request.joinedUserId,
          ),
        ),
      );
      const recipientUserIds: UserId[] = [];

      for (const recipientUserId of candidateUserIds) {
        const [recipient, option] = await Promise.all([
          userRepo.findById(recipientUserId),
          notificationOptRepo.findByUserIdInTransaction(input.executor, recipientUserId),
        ]);
        if (!recipient || recipient.status !== "ACTIVE" || !recipient.openId) {
          continue;
        }
        if (!notificationOptRepo.getSubscriptionSnapshot(option, "NEW_PARTNER").enabled) {
          continue;
        }
        recipientUserIds.push(recipientUserId);
      }

      const notificationPort: NewPartnerNotificationSchedulerPort =
        createNewPartnerNotificationSchedulerPort({ scheduler });
      for (const recipientUserId of recipientUserIds) {
        await notificationPort.request({
          template: "pr.new-partner",
          recipientUserId,
          channel: "WECHAT_SUBSCRIPTION",
          payload: {
            prId: request.prId,
            partnerId: request.partnerId,
            joinedUserId: request.joinedUserId,
            joinedAtIso: request.joinedAtIso,
            admissionCycleId: request.admissionCycleId,
          },
          metadata: {
            aggregate: { type: "partner_request", id: String(request.prId) },
            causationId: `partner_request:${request.prId}:new-partner:${request.partnerId}:${request.admissionCycleId}`,
          },
        });
      }

      return { recipientUserIds };
    },
  };
};

export const createTransactionBoundNewPartnerNotificationPort = (input: {
  executor: TransactionExecutor;
}): NewPartnerNotificationPort =>
  createNewPartnerNotificationPortWithWriter({
    ...input,
    writer: createTransactionBoundJobWriter(input.executor),
  });

/**
 * Curated PR/Notification handoff for an entered READY cycle. PR supplies
 * only the durable cycle and transaction-local active roster. Notification
 * owns source-time user/OpenID/credit filtering and private Job policy.
 */
export const createPRReadyNotificationPortWithWriter = (input: {
  writer: OncePerCauseJobWriter;
  executor: TransactionExecutor;
}): PRReadyNotificationPort => {
  const userRepo = new UserRepository(input.executor);
  const notificationOptRepo = new UserNotificationOptRepository();
  const scheduler = createNotificationOncePerCauseSchedulerAdapter(input.writer);

  return {
    async requestForSourceRecipients(request) {
      const candidateUserIds = Array.from(new Set(request.activeRecipientCandidateUserIds));
      const recipientUserIds: UserId[] = [];

      for (const recipientUserId of candidateUserIds) {
        const [recipient, option] = await Promise.all([
          userRepo.findById(recipientUserId),
          notificationOptRepo.findByUserIdInTransaction(input.executor, recipientUserId),
        ]);
        if (!recipient || recipient.status !== "ACTIVE" || !recipient.openId) {
          continue;
        }
        if (!notificationOptRepo.getSubscriptionSnapshot(option, "PR_READY").enabled) {
          continue;
        }
        recipientUserIds.push(recipientUserId);
      }

      const notificationPort: PRReadyNotificationSchedulerPort =
        createPRReadyNotificationSchedulerPort({ scheduler });
      for (const recipientUserId of recipientUserIds) {
        await notificationPort.request({
          template: "pr.ready",
          recipientUserId,
          channel: "WECHAT_SUBSCRIPTION",
          payload: {
            prId: request.prId,
            readyCycleId: request.readyCycleId,
          },
          metadata: {
            aggregate: { type: "partner_request", id: String(request.prId) },
            causationId: `partner_request:${request.prId}:ready:${request.readyCycleId}`,
          },
        });
      }

      return { recipientUserIds };
    },
  };
};

export const createTransactionBoundPRReadyNotificationPort = (input: {
  executor: TransactionExecutor;
}): PRReadyNotificationPort =>
  createPRReadyNotificationPortWithWriter({
    ...input,
    writer: createTransactionBoundJobWriter(input.executor),
  });

/**
 * Curated source handoff for one committed effective meeting-point change.
 * Source owners provide only immutable event facts and their transaction-local
 * active roster. Notification owns current source-time option filtering and
 * the private generic Job creation identity.
 */
export const createMeetingPointUpdatedNotificationPortWithWriter = (input: {
  writer: OncePerCauseJobWriter;
  executor: TransactionExecutor;
}): MeetingPointUpdatedNotificationPort => {
  const userRepo = new UserRepository(input.executor);
  const notificationOptRepo = new UserNotificationOptRepository();
  const scheduler = createNotificationOncePerCauseSchedulerAdapter(input.writer);

  return {
    async requestForSourceRecipients(request) {
      const candidateUserIds = Array.from(new Set(request.activeRecipientCandidateUserIds));
      const recipientUserIds: UserId[] = [];

      for (const recipientUserId of candidateUserIds) {
        const [recipient, option] = await Promise.all([
          userRepo.findById(recipientUserId),
          notificationOptRepo.findByUserIdInTransaction(input.executor, recipientUserId),
        ]);
        if (!recipient || recipient.status !== "ACTIVE" || !recipient.openId) {
          continue;
        }
        if (!notificationOptRepo.getSubscriptionSnapshot(option, "MEETING_POINT_UPDATED").enabled) {
          continue;
        }
        recipientUserIds.push(recipientUserId);
      }

      const notificationPort: MeetingPointUpdatedNotificationSchedulerPort =
        createMeetingPointUpdatedNotificationSchedulerPort({ scheduler });
      for (const recipientUserId of recipientUserIds) {
        await notificationPort.request({
          template: "pr.meeting-point-updated",
          recipientUserId,
          channel: "WECHAT_SUBSCRIPTION",
          payload: {
            prId: request.prId,
            meetingPointUpdateId: request.meetingPointUpdateId,
            meetingPointDescription: request.meetingPointDescription,
            updatedAtIso: request.updatedAtIso,
          },
          metadata: {
            aggregate: { type: "partner_request", id: String(request.prId) },
            causationId: [
              "partner_request",
              request.prId,
              "meeting-point",
              request.meetingPointUpdateId,
            ].join(":"),
            ...(request.correlationId ? { correlationId: request.correlationId } : {}),
          },
        });
      }

      return { recipientUserIds };
    },
  };
};

export const createTransactionBoundMeetingPointUpdatedNotificationPort = (input: {
  executor: TransactionExecutor;
}): MeetingPointUpdatedNotificationPort =>
  createMeetingPointUpdatedNotificationPortWithWriter({
    ...input,
    writer: createTransactionBoundJobWriter(input.executor),
  });

/**
 * PR calls this only from its named message transaction. Every repository
 * read uses the same executor as the later Job reservation writes, so a
 * source-time eligible recipient is never scheduled outside that transaction.
 */
export const createPRMessageSummaryNotificationPortWithWriter = (input: {
  writer: UntilAcknowledgedJobWriter;
  executor: TransactionExecutor;
  isChannelConfigured?: () => Promise<boolean>;
}): PRMessageSummaryNotificationPort => {
  const userRepo = new UserRepository(input.executor);
  const notificationOptRepo = new UserNotificationOptRepository();
  const scheduler = createNotificationUntilAcknowledgedSchedulerAdapter(input.writer);
  const isChannelConfigured =
    input.isChannelConfigured ??
    (() =>
      getNotificationOwner().isChannelConfigured({
        template: "pr.message-summary",
        channel: "WECHAT_SUBSCRIPTION",
      }));

  return {
    async requestForSourceRecipients(request) {
      if (!(await isChannelConfigured())) {
        return { recipientUserIds: [] };
      }

      const candidateUserIds = Array.from(
        new Set(
          request.activeRecipientCandidateUserIds.filter(
            (userId) => userId !== request.authorUserId,
          ),
        ),
      ).sort();
      const recipientUserIds: UserId[] = [];

      for (const recipientUserId of candidateUserIds) {
        const recipient = await userRepo.findById(recipientUserId);
        if (!recipient || recipient.status !== "ACTIVE" || !recipient.openId) {
          continue;
        }
        const option = await notificationOptRepo.findByUserIdForUpdateInTransaction(
          input.executor,
          recipientUserId,
        );
        if (!option?.wechatPrMessageOptIn || option.wechatPrMessageRemainingCount <= 0) {
          continue;
        }
        recipientUserIds.push(recipientUserId);
      }

      for (const recipientUserId of recipientUserIds) {
        await requestPRMessageSummaryNotification({
          request: {
            template: "pr.message-summary",
            recipientUserId,
            channel: "WECHAT_SUBSCRIPTION",
            payload: { prId: request.prId },
            metadata: {
              aggregate: { type: "partner_request", id: String(request.prId) },
              causationId: [
                "partner_request",
                request.prId,
                "message-window",
                request.windowStartCursor,
              ].join(":"),
            },
          },
          windowStartCursor: request.windowStartCursor,
          windowOpenedAt: request.windowOpenedAt,
          scheduler,
        });
      }

      return { recipientUserIds };
    },
  };
};

export const createTransactionBoundPRMessageSummaryNotificationPort = (input: {
  executor: TransactionExecutor;
  isChannelConfigured?: () => Promise<boolean>;
}): PRMessageSummaryNotificationPort =>
  createPRMessageSummaryNotificationPortWithWriter({
    ...input,
    writer: createTransactionBoundJobWriter(input.executor),
  });

export type { WaitlistPromotionNotificationPort };
