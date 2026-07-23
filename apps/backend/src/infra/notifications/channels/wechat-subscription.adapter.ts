import type {
  NotificationChannelPort,
  NotificationChannelSendResult,
  PreparedNotification,
} from "../../../domains/notification/owner/ports";
import {
  WeChatSubscriptionMessageError,
  WeChatSubscriptionMessageService,
} from "../../../services/WeChatSubscriptionMessageService";

const service = new WeChatSubscriptionMessageService();

/**
 * The narrow portion of the concrete WeChat service used by the migrated
 * Notification channel. Keeping this injectable makes the adapter's outcome
 * contract testable without a ConfigService, token request, or provider call.
 */
export type PreparedNotificationWeChatSubscriptionSender = {
  isConfirmationReminderConfigured?(): Promise<boolean>;
  sendConfirmationReminder?(input: {
    openId: string;
    orderContent: string;
    orderNo: string;
    appointmentAt: string;
    remark: string;
    page: string | null;
  }): Promise<string | number | null>;
  isActivityStartReminderConfigured?(): Promise<boolean>;
  sendActivityStartReminder?(input: {
    openId: string;
    activityName: string;
    startAt: string;
    location: string;
    remark: string;
    page: string | null;
  }): Promise<string | number | null>;
  isNewPartnerConfigured?(): Promise<boolean>;
  sendNewPartnerNotification?(input: {
    openId: string;
    applicantName: string;
    teamName: string;
    tip: string;
    appliedAt: string;
    page: string | null;
  }): Promise<string | number | null>;
  isMeetingPointUpdatedConfigured?(): Promise<boolean>;
  sendMeetingPointUpdatedNotification?(input: {
    openId: string;
    updateType: string;
    operatorName: string;
    updatedAt: string;
    meetingPointDescription: string;
    page: string | null;
  }): Promise<string | number | null>;
  isPRReadyConfigured?(): Promise<boolean>;
  sendPRReadyNotification?(input: {
    openId: string;
    title: string;
    type: string;
    status: string;
    remark: string;
    page: string | null;
  }): Promise<string | number | null>;
  isPRMessageConfigured?(): Promise<boolean>;
  sendPRMessageNotification?(input: {
    openId: string;
    threadTitle: string;
    authorName: string;
    sentAt: string;
    messageSummary: string;
    page: string | null;
  }): Promise<string | number | null>;
  isWaitlistPromotedConfigured?(): Promise<boolean>;
  sendWaitlistPromotedNotification?(input: {
    openId: string;
    title: string;
    status: string;
    remark: string;
    page: string | null;
  }): Promise<string | number | null>;
};

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

  return {
    code: null,
    message: error instanceof Error ? error.message : String(error),
  };
};

const isPreparedNotificationConfigured = async (
  sender: PreparedNotificationWeChatSubscriptionSender,
  template: PreparedNotification["template"],
): Promise<boolean> => {
  if (template === "pr.confirmation-reminder") {
    return (await sender.isConfirmationReminderConfigured?.()) ?? false;
  }
  if (template === "pr.activity-start-reminder") {
    return (await sender.isActivityStartReminderConfigured?.()) ?? false;
  }
  if (template === "pr.new-partner") {
    return (await sender.isNewPartnerConfigured?.()) ?? false;
  }
  if (template === "pr.meeting-point-updated") {
    return (await sender.isMeetingPointUpdatedConfigured?.()) ?? false;
  }
  if (template === "pr.ready") {
    return (await sender.isPRReadyConfigured?.()) ?? false;
  }
  if (template === "pr.message-summary") {
    return (await sender.isPRMessageConfigured?.()) ?? false;
  }
  return (await sender.isWaitlistPromotedConfigured?.()) ?? false;
};

/**
 * New owner-facing port. It deliberately exposes a neutral outcome rather
 * than the legacy `SENT | FAILED | TRANSPORT_ERROR` shape: a current WeChat
 * transport failure does not prove whether the provider applied the effect.
 */
export const createWeChatSubscriptionPreparedNotificationChannel = (
  sender: PreparedNotificationWeChatSubscriptionSender = service,
): NotificationChannelPort => ({
  async isConfigured(input) {
    if (input.channel !== "WECHAT_SUBSCRIPTION") {
      return false;
    }
    return isPreparedNotificationConfigured(sender, input.template);
  },

  async send(message: PreparedNotification): Promise<NotificationChannelSendResult> {
    if (message.template === "pr.confirmation-reminder") {
      const configured = (await sender.isConfirmationReminderConfigured?.()) ?? false;
      if (!configured) {
        return {
          outcome: "PERMANENT_REFUSAL",
          errorCode: "CHANNEL_NOT_CONFIGURED",
          errorMessage: "Confirmation reminder subscription message channel is not configured",
        };
      }

      try {
        if (!sender.sendConfirmationReminder) {
          return {
            outcome: "PERMANENT_REFUSAL",
            errorCode: "CHANNEL_NOT_CONFIGURED",
            errorMessage: "Confirmation reminder subscription message channel is not configured",
          };
        }
        const providerMessageId = await sender.sendConfirmationReminder({
          openId: message.recipientChannelAddress,
          orderContent: message.content.orderContent,
          orderNo: message.content.orderNo,
          appointmentAt: message.content.appointmentAt,
          remark: message.content.remark,
          page: message.content.page,
        });
        return {
          outcome: "ACCEPTED",
          providerReference: providerMessageId === null ? null : String(providerMessageId),
        };
      } catch (error) {
        return classifyWeChatSubscriptionNotificationFailure(
          classifyWeChatSubscriptionError(error),
        );
      }
    }

    if (message.template === "pr.activity-start-reminder") {
      const configured = (await sender.isActivityStartReminderConfigured?.()) ?? false;
      if (!configured) {
        return {
          outcome: "PERMANENT_REFUSAL",
          errorCode: "CHANNEL_NOT_CONFIGURED",
          errorMessage: "Activity start reminder subscription message channel is not configured",
        };
      }

      try {
        if (!sender.sendActivityStartReminder) {
          return {
            outcome: "PERMANENT_REFUSAL",
            errorCode: "CHANNEL_NOT_CONFIGURED",
            errorMessage: "Activity start reminder subscription message channel is not configured",
          };
        }
        const providerMessageId = await sender.sendActivityStartReminder({
          openId: message.recipientChannelAddress,
          activityName: message.content.activityName,
          startAt: message.content.startAt,
          location: message.content.location,
          remark: message.content.remark,
          page: message.content.page,
        });
        return {
          outcome: "ACCEPTED",
          providerReference: providerMessageId === null ? null : String(providerMessageId),
        };
      } catch (error) {
        return classifyWeChatSubscriptionNotificationFailure(
          classifyWeChatSubscriptionError(error),
        );
      }
    }

    if (message.template === "pr.new-partner") {
      const configured = (await sender.isNewPartnerConfigured?.()) ?? false;
      if (!configured) {
        return {
          outcome: "PERMANENT_REFUSAL",
          errorCode: "CHANNEL_NOT_CONFIGURED",
          errorMessage: "New partner subscription message channel is not configured",
        };
      }

      try {
        if (!sender.sendNewPartnerNotification) {
          return {
            outcome: "PERMANENT_REFUSAL",
            errorCode: "CHANNEL_NOT_CONFIGURED",
            errorMessage: "New partner subscription message channel is not configured",
          };
        }
        const providerMessageId = await sender.sendNewPartnerNotification({
          openId: message.recipientChannelAddress,
          applicantName: message.content.applicantName,
          teamName: message.content.teamName,
          tip: message.content.tip,
          appliedAt: message.content.appliedAt,
          page: message.content.page,
        });
        return {
          outcome: "ACCEPTED",
          providerReference: providerMessageId === null ? null : String(providerMessageId),
        };
      } catch (error) {
        return classifyWeChatSubscriptionNotificationFailure(
          classifyWeChatSubscriptionError(error),
        );
      }
    }

    if (message.template === "pr.meeting-point-updated") {
      const configured = (await sender.isMeetingPointUpdatedConfigured?.()) ?? false;
      if (!configured) {
        return {
          outcome: "PERMANENT_REFUSAL",
          errorCode: "CHANNEL_NOT_CONFIGURED",
          errorMessage: "Meeting point updated subscription message channel is not configured",
        };
      }

      try {
        if (!sender.sendMeetingPointUpdatedNotification) {
          return {
            outcome: "PERMANENT_REFUSAL",
            errorCode: "CHANNEL_NOT_CONFIGURED",
            errorMessage: "Meeting point updated subscription message channel is not configured",
          };
        }
        const providerMessageId = await sender.sendMeetingPointUpdatedNotification({
          openId: message.recipientChannelAddress,
          updateType: message.content.updateType,
          operatorName: message.content.operatorName,
          updatedAt: message.content.updatedAt,
          meetingPointDescription: message.content.meetingPointDescription,
          page: message.content.page,
        });
        return {
          outcome: "ACCEPTED",
          providerReference: providerMessageId === null ? null : String(providerMessageId),
        };
      } catch (error) {
        return classifyWeChatSubscriptionNotificationFailure(
          classifyWeChatSubscriptionError(error),
        );
      }
    }

    if (message.template === "pr.ready") {
      const configured = (await sender.isPRReadyConfigured?.()) ?? false;
      if (!configured) {
        return {
          outcome: "PERMANENT_REFUSAL",
          errorCode: "CHANNEL_NOT_CONFIGURED",
          errorMessage: "PR ready subscription message channel is not configured",
        };
      }

      try {
        if (!sender.sendPRReadyNotification) {
          return {
            outcome: "PERMANENT_REFUSAL",
            errorCode: "CHANNEL_NOT_CONFIGURED",
            errorMessage: "PR ready subscription message channel is not configured",
          };
        }
        const providerMessageId = await sender.sendPRReadyNotification({
          openId: message.recipientChannelAddress,
          title: message.content.title,
          type: message.content.type,
          status: message.content.status,
          remark: message.content.remark,
          page: message.content.page,
        });
        return {
          outcome: "ACCEPTED",
          providerReference: providerMessageId === null ? null : String(providerMessageId),
        };
      } catch (error) {
        return classifyWeChatSubscriptionNotificationFailure(
          classifyWeChatSubscriptionError(error),
        );
      }
    }

    if (message.template === "pr.message-summary") {
      const configured = (await sender.isPRMessageConfigured?.()) ?? false;
      if (!configured) {
        return {
          outcome: "PERMANENT_REFUSAL",
          errorCode: "CHANNEL_NOT_CONFIGURED",
          errorMessage: "PR message subscription message channel is not configured",
        };
      }

      try {
        if (!sender.sendPRMessageNotification) {
          return {
            outcome: "PERMANENT_REFUSAL",
            errorCode: "CHANNEL_NOT_CONFIGURED",
            errorMessage: "PR message subscription message channel is not configured",
          };
        }
        const providerMessageId = await sender.sendPRMessageNotification({
          openId: message.recipientChannelAddress,
          threadTitle: message.content.threadTitle,
          authorName: message.content.authorName,
          sentAt: message.content.sentAt,
          messageSummary: message.content.messageSummary,
          page: message.content.page,
        });
        return {
          outcome: "ACCEPTED",
          providerReference: providerMessageId === null ? null : String(providerMessageId),
        };
      } catch (error) {
        return classifyWeChatSubscriptionNotificationFailure(
          classifyWeChatSubscriptionError(error),
        );
      }
    }

    const configured = (await sender.isWaitlistPromotedConfigured?.()) ?? false;
    if (!configured) {
      return {
        outcome: "PERMANENT_REFUSAL",
        errorCode: "CHANNEL_NOT_CONFIGURED",
        errorMessage: "Waitlist promoted subscription message channel is not configured",
      };
    }

    try {
      if (!sender.sendWaitlistPromotedNotification) {
        return {
          outcome: "PERMANENT_REFUSAL",
          errorCode: "CHANNEL_NOT_CONFIGURED",
          errorMessage: "Waitlist promoted subscription message channel is not configured",
        };
      }
      const providerMessageId = await sender.sendWaitlistPromotedNotification({
        openId: message.recipientChannelAddress,
        title: message.content.title,
        status: message.content.status,
        remark: message.content.remark,
        page: message.content.page,
      });
      return {
        outcome: "ACCEPTED",
        providerReference: providerMessageId === null ? null : String(providerMessageId),
      };
    } catch (error) {
      return classifyWeChatSubscriptionNotificationFailure(classifyWeChatSubscriptionError(error));
    }
  },
});

export const classifyWeChatSubscriptionNotificationFailure = (error: {
  code: string | null;
  message: string;
}): NotificationChannelSendResult =>
  error.code === "43101"
    ? {
        outcome: "RECIPIENT_PERMISSION_REVOKED",
        errorCode: error.code,
        errorMessage: error.message,
      }
    : {
        outcome: "AMBIGUOUS",
        errorCode: error.code,
        errorMessage: error.message,
      };
