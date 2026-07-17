import type {
  NotificationDispatchSendResult,
  NotificationKind,
} from "../../../domains/notification";
import {
  WeChatSubscriptionMessageError,
  WeChatSubscriptionMessageService,
} from "../../../services/WeChatSubscriptionMessageService";
import {
  toChannelErrorLike,
  toFailedDispatchResult,
  type WeChatSubscriptionChannelMessage,
} from "./notification-channel-adapter";

const service = new WeChatSubscriptionMessageService();

const classifyWeChatSubscriptionError = (
  error: unknown,
): {
  code: string | null;
  message: string;
} => {
  if (error instanceof WeChatSubscriptionMessageError) {
    return {
      code: error.errorCode,
      message: error.message,
    };
  }

  return toChannelErrorLike(error);
};

export const isWeChatSubscriptionNotificationConfigured = async (
  kind: NotificationKind,
): Promise<boolean> => {
  if (kind === "REMINDER_CONFIRMATION") {
    return service.isConfirmationReminderConfigured();
  }
  if (kind === "ACTIVITY_START_REMINDER") {
    return service.isActivityStartReminderConfigured();
  }
  if (kind === "NEW_PARTNER") {
    return service.isNewPartnerConfigured();
  }
  if (kind === "MEETING_POINT_UPDATED") {
    return service.isMeetingPointUpdatedConfigured();
  }
  if (kind === "PR_READY") {
    return service.isPRReadyConfigured();
  }
  if (kind === "WAITLIST_PROMOTED") {
    return service.isWaitlistPromotedConfigured();
  }
  if (kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
    return service.isWaitlistPromotedConfigured();
  }
  return service.isPRMessageConfigured();
};

export const sendWeChatSubscriptionNotification = async (
  message: WeChatSubscriptionChannelMessage,
): Promise<NotificationDispatchSendResult> => {
  try {
    const providerMessageId = await send(message);
    return {
      status: "SENT",
      providerMessageId,
    };
  } catch (error) {
    return toFailedDispatchResult(classifyWeChatSubscriptionError(error));
  }
};

const send = async (message: WeChatSubscriptionChannelMessage): Promise<string | number | null> => {
  if (message.kind === "REMINDER_CONFIRMATION") {
    return service.sendConfirmationReminder({
      openId: message.openId,
      orderContent: message.orderContent,
      orderNo: message.orderNo,
      appointmentAt: message.appointmentAt,
      remark: message.remark,
      page: message.page,
    });
  }

  if (message.kind === "ACTIVITY_START_REMINDER") {
    return service.sendActivityStartReminder({
      openId: message.openId,
      activityName: message.activityName,
      startAt: message.startAt,
      location: message.location,
      remark: message.remark,
      page: message.page,
    });
  }

  if (message.kind === "NEW_PARTNER") {
    return service.sendNewPartnerNotification({
      openId: message.openId,
      applicantName: message.applicantName,
      teamName: message.teamName,
      tip: message.tip,
      appliedAt: message.appliedAt,
      page: message.page,
    });
  }

  if (message.kind === "MEETING_POINT_UPDATED") {
    return service.sendMeetingPointUpdatedNotification({
      openId: message.openId,
      updateType: message.updateType,
      operatorName: message.operatorName,
      updatedAt: message.updatedAt,
      meetingPointDescription: message.meetingPointDescription,
      page: message.page,
    });
  }

  if (message.kind === "PR_READY") {
    return service.sendPRReadyNotification({
      openId: message.openId,
      title: message.title,
      type: message.type,
      status: message.status,
      remark: message.remark,
      page: message.page,
    });
  }

  if (message.kind === "WAITLIST_PROMOTED" || message.kind === "WAITLIST_ALTERNATIVE_AVAILABLE") {
    return service.sendWaitlistPromotedNotification({
      openId: message.openId,
      title: message.title,
      status: message.status,
      remark: message.remark,
      page: message.page,
    });
  }

  return service.sendPRMessageNotification({
    openId: message.openId,
    threadTitle: message.threadTitle,
    authorName: message.authorName,
    sentAt: message.sentAt,
    messageSummary: message.messageSummary,
    page: message.page,
  });
};
