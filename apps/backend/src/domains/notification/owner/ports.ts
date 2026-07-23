import type { BusinessNotificationChannel, BusinessNotificationTemplate } from "../contracts";
import type {
  ActivityStartReminderNotificationTask,
  ConfirmationReminderNotificationTask,
  MeetingPointUpdatedNotificationTask,
  NewPartnerNotificationTask,
  NotificationTask,
  PRMessageSummaryNotificationTask,
  PRReadyNotificationTask,
  WaitlistAlternativeAvailableNotificationTask,
  WaitlistPromotedNotificationTask,
} from "./task";

type NotificationTaskSchedule = {
  task: NotificationTask;
  runAt: Date;
  timing: {
    resolutionMs: number;
    earlyToleranceUnits: number;
    lateToleranceUnits: number;
  };
};

export type NotificationCredit = { kind: "UNLIMITED" } | { kind: "LIMITED"; remaining: number };

export type NotificationOption = {
  preferred: boolean;
  credit: NotificationCredit;
};

export const canDispatchNotification = (option: NotificationOption): boolean =>
  option.preferred && (option.credit.kind === "UNLIMITED" || option.credit.remaining > 0);

export interface NotificationTaskSchedulerPort {
  enqueueOncePerCause(
    input: NotificationTaskSchedule & {
      creationKey: string;
    },
  ): Promise<{ creation: "CREATED" | "COALESCED" }>;
  replaceActive(
    input: NotificationTaskSchedule & {
      coordinationKey: string;
      activeKeyPrefix: string;
      scheduleKey: string;
    },
  ): Promise<{ creation: "CREATED" | "COALESCED" }>;
  cancelActive(input: { coordinationKey: string; activeKeyPrefix: string }): Promise<number>;
}

/**
 * Windowed work is deliberately a feature-specific scheduler capability.
 * Ordinary Notification owner commands cannot accidentally manufacture a
 * message-attention reservation; only the named atomic source port receives
 * this narrower dependency.
 */
export interface NotificationUntilAcknowledgedTaskSchedulerPort {
  enqueueUntilAcknowledged(
    input: NotificationTaskSchedule & {
      creationKey: string;
      windowStartCursor: number;
      highWaterCursor: number;
    },
  ): Promise<{ creation: "CREATED" | "COALESCED" }>;
}

/**
 * Notification owns the business scope and private creation-key policy. This
 * port only receives the resulting opaque key identity and delegates neutral
 * held-reservation control to the generic Job runtime.
 */
export interface NotificationWindowInvalidationPort {
  releaseHeldReservation(input: {
    creationKey: string;
  }): Promise<{ jobId: number | null; released: boolean; canceled: boolean }>;
  releaseHeldReservationsByCreationKeyPrefix(input: {
    creationKeyPrefix: string;
  }): Promise<{ released: number; canceled: number; jobIds: number[] }>;
}

/**
 * Notification owns private creation identity; this port exposes only the
 * neutral generic acknowledgement transition needed by a semantic owner
 * command. It does not carry a business cursor meaning into Job.
 */
export interface NotificationWindowAcknowledgementPort {
  acknowledgeHeldReservation(input: {
    creationKey: string;
    throughCursor: number;
  }): Promise<{ jobId: number | null; released: boolean; canceled: boolean; stale: boolean }>;
}

export interface NotificationOptionPort {
  load(input: {
    recipientUserId: string;
    template: BusinessNotificationTemplate;
    channel: BusinessNotificationChannel;
  }): Promise<NotificationOption>;
  consumeLimitedCredit(input: {
    recipientUserId: string;
    template: BusinessNotificationTemplate;
    channel: BusinessNotificationChannel;
  }): Promise<{ consumed: boolean; remaining: number }>;
  clearRecipientPermission(input: {
    recipientUserId: string;
    template: BusinessNotificationTemplate;
    channel: BusinessNotificationChannel;
  }): Promise<void>;
}

export type WaitlistPromotedDispatchContext =
  | {
      state: "READY";
      recipientChannelAddress: string;
      title: string;
      page: string | null;
    }
  | {
      state: "SKIPPED";
      reason:
        | "USER_INACTIVE_OR_MISSING"
        | "USER_OPENID_MISSING"
        | "PR_MISSING"
        | "RECIPIENT_NOT_PROMOTED_PARTICIPANT"
        | "WAITLIST_CYCLE_SUPERSEDED";
    };

export type ReadyWaitlistPromotedDispatchContext = Extract<
  WaitlistPromotedDispatchContext,
  { state: "READY" }
>;

export type WaitlistAlternativeAvailableDispatchContext =
  | {
      state: "READY";
      recipientChannelAddress: string;
      title: string;
      page: string | null;
    }
  | {
      state: "SKIPPED";
      reason:
        | "USER_INACTIVE_OR_MISSING"
        | "USER_OPENID_MISSING"
        | "SOURCE_WAITLIST_SLOT_NOT_PENDING"
        | "SOURCE_WAITLIST_CYCLE_SUPERSEDED"
        | "SOURCE_PR_MISSING"
        | "CANDIDATE_PR_MISSING"
        | "CANDIDATE_PR_MISMATCH"
        | "CANDIDATE_PR_NOT_JOINABLE"
        | "RECIPIENT_TIME_CONFLICT";
    };

export type ReadyWaitlistAlternativeAvailableDispatchContext = Extract<
  WaitlistAlternativeAvailableDispatchContext,
  { state: "READY" }
>;

export type ActivityStartReminderDispatchContext =
  | {
      state: "READY";
      recipientChannelAddress: string;
      activityStartAt: string;
      activityName: string;
      location: string;
      page: string | null;
    }
  | {
      state: "SKIPPED";
      reason:
        | "USER_INACTIVE_OR_MISSING"
        | "USER_OPENID_MISSING"
        | "PR_MISSING_OR_UNSUPPORTED"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "ACTIVITY_START_UNAVAILABLE";
    };

export type ReadyActivityStartReminderDispatchContext = Extract<
  ActivityStartReminderDispatchContext,
  { state: "READY" }
>;

export type ConfirmationReminderDispatchContext =
  | {
      state: "READY";
      confirmationStartAt: string | null;
      confirmationEndAt: string | null;
      title: string;
      activityStartAt: string;
      recipientChannelAddress: string;
      page: string | null;
    }
  | {
      state: "SKIPPED";
      reason:
        | "USER_INACTIVE_OR_MISSING"
        | "USER_OPENID_MISSING"
        | "PR_MISSING_OR_UNSUPPORTED"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "ACTIVITY_START_UNAVAILABLE"
        | "CONFIRMATION_POLICY_UNAVAILABLE"
        | "CONFIRMATION_TRIGGER_UNAVAILABLE";
    };

export type ReadyConfirmationReminderDispatchContext = Extract<
  ConfirmationReminderDispatchContext,
  { state: "READY" }
>;

export type NewPartnerDispatchContext =
  | {
      state: "READY";
      recipientChannelAddress: string;
      applicantName: string;
      teamName: string;
      page: string | null;
    }
  | {
      state: "SKIPPED";
      reason:
        | "USER_INACTIVE_OR_MISSING"
        | "USER_OPENID_MISSING"
        | "PR_MISSING_OR_UNSUPPORTED"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "NEW_PARTNER_ADMISSION_SUPERSEDED";
    };

export type ReadyNewPartnerDispatchContext = Extract<NewPartnerDispatchContext, { state: "READY" }>;

export type MeetingPointUpdatedDispatchContext =
  | {
      state: "READY";
      recipientChannelAddress: string;
      page: string | null;
    }
  | {
      state: "SKIPPED";
      reason:
        | "USER_INACTIVE_OR_MISSING"
        | "USER_OPENID_MISSING"
        | "PR_MISSING"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT";
    };

export type ReadyMeetingPointUpdatedDispatchContext = Extract<
  MeetingPointUpdatedDispatchContext,
  { state: "READY" }
>;

export type PRReadyDispatchContext =
  | {
      state: "READY";
      recipientChannelAddress: string;
      title: string;
      type: string;
      page: string | null;
    }
  | {
      state: "SKIPPED";
      reason:
        | "USER_INACTIVE_OR_MISSING"
        | "USER_OPENID_MISSING"
        | "PR_MISSING"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "PR_NOT_READY"
        | "PR_READY_CYCLE_SUPERSEDED";
    };

export type ReadyPRReadyDispatchContext = Extract<PRReadyDispatchContext, { state: "READY" }>;

export type PRMessageSummaryDispatchContext =
  | {
      state: "READY";
      recipientChannelAddress: string;
      threadTitle: string;
      authorName: string;
      sentAt: string;
      messageSummary: string;
      page: string | null;
    }
  | {
      state: "SKIPPED";
      reason:
        | "USER_INACTIVE_OR_MISSING"
        | "USER_OPENID_MISSING"
        | "PR_MISSING"
        | "PR_TERMINAL"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "MESSAGE_WINDOW_EMPTY";
    };

export type ReadyPRMessageSummaryDispatchContext = Extract<
  PRMessageSummaryDispatchContext,
  { state: "READY" }
>;

export type ActivityStartReminderSchedulingContext =
  | { state: "READY"; activityStartAt: string }
  | {
      state: "SKIPPED";
      reason:
        | "PR_MISSING_OR_UNSUPPORTED"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "ACTIVITY_START_UNAVAILABLE";
    };

export type ConfirmationReminderSchedulingContext =
  | { state: "READY"; confirmationStartAt: string | null; confirmationEndAt: string | null }
  | {
      state: "SKIPPED";
      reason:
        | "PR_MISSING_OR_UNSUPPORTED"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "ACTIVITY_START_UNAVAILABLE"
        | "CONFIRMATION_POLICY_UNAVAILABLE"
        | "CONFIRMATION_TRIGGER_UNAVAILABLE";
    };

/** Minimal creation-time facts; deliberately excludes dispatch rendering. */
export interface NotificationSchedulingContextPort {
  resolveActivityStartReminder(input: {
    prId: number;
    recipientUserId: string;
  }): Promise<ActivityStartReminderSchedulingContext>;
  resolveConfirmationReminder?(input: {
    prId: number;
    slotId: number;
    recipientUserId: string;
  }): Promise<ConfirmationReminderSchedulingContext>;
}

/**
 * Cross-owner facts are supplied through this port. Its concrete adapter may
 * ask a curated PR query; Notification's owner core never imports PR internals.
 */
export interface NotificationDispatchContextPort {
  resolveActivityStartReminder(
    task: ActivityStartReminderNotificationTask,
  ): Promise<ActivityStartReminderDispatchContext>;
  resolveWaitlistPromoted(
    task: WaitlistPromotedNotificationTask,
  ): Promise<WaitlistPromotedDispatchContext>;
  resolveWaitlistAlternativeAvailable?(
    task: WaitlistAlternativeAvailableNotificationTask,
  ): Promise<WaitlistAlternativeAvailableDispatchContext>;
  resolveNewPartner?(task: NewPartnerNotificationTask): Promise<NewPartnerDispatchContext>;
  resolveMeetingPointUpdated?(
    task: MeetingPointUpdatedNotificationTask,
  ): Promise<MeetingPointUpdatedDispatchContext>;
  resolvePRReady?(task: PRReadyNotificationTask): Promise<PRReadyDispatchContext>;
  resolvePRMessageSummary?(
    task: PRMessageSummaryNotificationTask,
    input: { windowStartCursor: number },
  ): Promise<PRMessageSummaryDispatchContext>;
  resolveConfirmationReminder?(
    task: ConfirmationReminderNotificationTask,
  ): Promise<ConfirmationReminderDispatchContext>;
}

export type PreparedNotification =
  | {
      channel: "WECHAT_SUBSCRIPTION";
      template: "pr.activity-start-reminder";
      recipientChannelAddress: string;
      content: {
        activityName: string;
        startAt: string;
        location: string;
        remark: string;
        page: string | null;
      };
    }
  | {
      channel: "WECHAT_SUBSCRIPTION";
      template: "pr.waitlist-promoted";
      recipientChannelAddress: string;
      content: {
        title: string;
        status: string;
        remark: string;
        page: string | null;
      };
    }
  | {
      channel: "WECHAT_SUBSCRIPTION";
      template: "pr.waitlist-alternative-available";
      recipientChannelAddress: string;
      content: {
        title: string;
        status: string;
        remark: string;
        page: string | null;
      };
    }
  | {
      channel: "WECHAT_SUBSCRIPTION";
      template: "pr.confirmation-reminder";
      recipientChannelAddress: string;
      content: {
        orderContent: string;
        orderNo: string;
        appointmentAt: string;
        remark: string;
        page: string | null;
      };
    }
  | {
      channel: "WECHAT_SUBSCRIPTION";
      template: "pr.new-partner";
      recipientChannelAddress: string;
      content: {
        applicantName: string;
        teamName: string;
        tip: string;
        appliedAt: string;
        page: string | null;
      };
    }
  | {
      channel: "WECHAT_SUBSCRIPTION";
      template: "pr.meeting-point-updated";
      recipientChannelAddress: string;
      content: {
        updateType: string;
        operatorName: string;
        updatedAt: string;
        meetingPointDescription: string;
        page: string | null;
      };
    }
  | {
      channel: "WECHAT_SUBSCRIPTION";
      template: "pr.ready";
      recipientChannelAddress: string;
      content: {
        title: string;
        type: string;
        status: string;
        remark: string;
        page: string | null;
      };
    }
  | {
      channel: "WECHAT_SUBSCRIPTION";
      template: "pr.message-summary";
      recipientChannelAddress: string;
      content: {
        threadTitle: string;
        authorName: string;
        sentAt: string;
        messageSummary: string;
        page: string | null;
      };
    };

export type NotificationChannelSendResult =
  | { outcome: "ACCEPTED"; providerReference: string | null }
  | { outcome: "RECIPIENT_PERMISSION_REVOKED"; errorCode: string | null; errorMessage: string }
  | { outcome: "PERMANENT_REFUSAL"; errorCode: string | null; errorMessage: string }
  | {
      outcome: "PROVEN_NOT_APPLIED_RETRYABLE";
      errorCode: string | null;
      errorMessage: string;
    }
  | { outcome: "AMBIGUOUS"; errorCode: string | null; errorMessage: string };

export interface NotificationChannelPort {
  isConfigured?(input: {
    template: BusinessNotificationTemplate;
    channel: BusinessNotificationChannel;
  }): Promise<boolean>;
  send(input: PreparedNotification): Promise<NotificationChannelSendResult>;
}
