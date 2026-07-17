import type {
  NotificationDispatchFailureReason,
  NotificationDispatchSendResult,
} from "../../../domains/notification";

type NotificationChannelErrorLike = {
  code: string | null;
  message: string;
};

export type WeChatSubscriptionChannelMessage =
  | {
      kind: "REMINDER_CONFIRMATION";
      openId: string;
      orderContent: string;
      orderNo: string;
      appointmentAt: string;
      remark: string;
      page: string | null;
    }
  | {
      kind: "ACTIVITY_START_REMINDER";
      openId: string;
      activityName: string;
      startAt: string;
      location: string;
      remark: string;
      page: string | null;
    }
  | {
      kind: "NEW_PARTNER";
      openId: string;
      applicantName: string;
      teamName: string;
      tip: string;
      appliedAt: string;
      page: string | null;
    }
  | {
      kind: "MEETING_POINT_UPDATED";
      openId: string;
      updateType: string;
      operatorName: string;
      updatedAt: string;
      meetingPointDescription: string;
      page: string | null;
    }
  | {
      kind: "PR_READY";
      openId: string;
      title: string;
      type: string;
      status: string;
      remark: string;
      page: string | null;
    }
  | {
      kind: "WAITLIST_PROMOTED";
      openId: string;
      title: string;
      status: string;
      remark: string;
      page: string | null;
    }
  | {
      kind: "WAITLIST_ALTERNATIVE_AVAILABLE";
      openId: string;
      title: string;
      status: string;
      remark: string;
      page: string | null;
    }
  | {
      kind: "PR_MESSAGE";
      openId: string;
      threadTitle: string;
      authorName: string;
      sentAt: string;
      messageSummary: string;
      page: string | null;
    };

export const toFailedDispatchResult = (
  error: NotificationChannelErrorLike,
): NotificationDispatchSendResult => ({
  status: "FAILED",
  reason: resolveFailureReason(error.code),
  errorCode: error.code,
  errorMessage: error.message,
});

const resolveFailureReason = (errorCode: string | null): NotificationDispatchFailureReason =>
  errorCode === "43101" ? "RECIPIENT_PERMISSION_REVOKED" : "TRANSPORT_ERROR";

export const toChannelErrorLike = (error: unknown): NotificationChannelErrorLike => {
  if (error instanceof Error) {
    return {
      code: null,
      message: error.message,
    };
  }

  return {
    code: null,
    message: String(error),
  };
};
