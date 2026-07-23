import assert from "node:assert/strict";
import { describe, it } from "vitest";

const loadAdapter = async () => {
  process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";
  return import("./wechat-subscription.adapter");
};

const preparedWaitlistPromotedNotification = {
  channel: "WECHAT_SUBSCRIPTION" as const,
  template: "pr.waitlist-promoted" as const,
  recipientChannelAddress: "openid-1",
  content: {
    title: "周末徒步",
    status: "候补成功",
    remark: "已为你保留名额",
    page: "/pr/12",
  },
};

const preparedWaitlistAlternativeAvailableNotification = {
  channel: "WECHAT_SUBSCRIPTION" as const,
  template: "pr.waitlist-alternative-available" as const,
  recipientChannelAddress: "openid-alternative",
  content: {
    title: "周末徒步",
    status: "有可加入名额",
    remark: "同类同地点有其它 PR 可加入",
    page: "/pr/99",
  },
};

const preparedActivityStartReminderNotification = {
  channel: "WECHAT_SUBSCRIPTION" as const,
  template: "pr.activity-start-reminder" as const,
  recipientChannelAddress: "openid-activity",
  content: {
    activityName: "徒步 周末白云山",
    startAt: "2026-07-23 10:30",
    location: "白云山南门",
    remark: "提前时间更充足",
    page: "/pr/42",
  },
};

const preparedConfirmationReminderNotification = {
  channel: "WECHAT_SUBSCRIPTION" as const,
  template: "pr.confirmation-reminder" as const,
  recipientChannelAddress: "openid-confirmation",
  content: {
    orderContent: "周末徒步",
    orderNo: "PR-42-000001",
    appointmentAt: "2026-07-23 14:00",
    remark: "请尽快确认参与活动",
    page: "/pr/42",
  },
};

const preparedNewPartnerNotification = {
  channel: "WECHAT_SUBSCRIPTION" as const,
  template: "pr.new-partner" as const,
  recipientChannelAddress: "openid-new-partner",
  content: {
    applicantName: "小明",
    teamName: "周末徒步",
    tip: "有新搭子加入",
    appliedAt: "2026-07-23 10:30",
    page: "/pr/42",
  },
};

const preparedMeetingPointUpdatedNotification = {
  channel: "WECHAT_SUBSCRIPTION" as const,
  template: "pr.meeting-point-updated" as const,
  recipientChannelAddress: "openid-meeting-point",
  content: {
    updateType: "碰头地点",
    operatorName: "系统",
    updatedAt: "2026-07-23 10:30",
    meetingPointDescription: "白云山南门星巴克门口",
    page: "/pr/42",
  },
};

const preparedPRReadyNotification = {
  channel: "WECHAT_SUBSCRIPTION" as const,
  template: "pr.ready" as const,
  recipientChannelAddress: "openid-pr-ready",
  content: {
    title: "周末徒步",
    type: "徒步",
    status: "已就绪",
    remark: "已成团，可下单；不可直接加入退出",
    page: "/pr/42",
  },
};

const preparedPRMessageSummaryNotification = {
  channel: "WECHAT_SUBSCRIPTION" as const,
  template: "pr.message-summary" as const,
  recipientChannelAddress: "openid-message",
  content: {
    threadTitle: "周末徒步",
    authorName: "小明",
    sentAt: "2026/07/23 10:30",
    messageSummary: "2条留言，请尽快查看",
    page: "/pr/42",
  },
};

const unusedActivitySender = {
  isActivityStartReminderConfigured: async () => false,
  sendActivityStartReminder: async () => {
    throw new Error("activity sender is not expected");
  },
};

describe("WeChat subscription Notification channel", () => {
  it("refuses dispatch before a configured provider call", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      ...unusedActivitySender,
      isWaitlistPromotedConfigured: async () => false,
      sendWaitlistPromotedNotification: async () => {
        throw new Error("must not call an unconfigured channel");
      },
    });

    assert.deepEqual(await channel.send(preparedWaitlistPromotedNotification), {
      outcome: "PERMANENT_REFUSAL",
      errorCode: "CHANNEL_NOT_CONFIGURED",
      errorMessage: "Waitlist promoted subscription message channel is not configured",
    });
  });

  it("maps an accepted provider response and preserves the provider reference", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      ...unusedActivitySender,
      isWaitlistPromotedConfigured: async () => true,
      sendWaitlistPromotedNotification: async (input) => {
        assert.deepEqual(input, {
          openId: "openid-1",
          title: "周末徒步",
          status: "候补成功",
          remark: "已为你保留名额",
          page: "/pr/12",
        });
        return 123;
      },
    });

    assert.deepEqual(await channel.send(preparedWaitlistPromotedNotification), {
      outcome: "ACCEPTED",
      providerReference: "123",
    });
  });

  it("reuses the waitlist-promoted provider template for alternative availability", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isWaitlistPromotedConfigured: async () => true,
      sendWaitlistPromotedNotification: async (input) => {
        assert.deepEqual(input, {
          openId: "openid-alternative",
          title: "周末徒步",
          status: "有可加入名额",
          remark: "同类同地点有其它 PR 可加入",
          page: "/pr/99",
        });
        return "alternative-provider-id";
      },
    });

    assert.deepEqual(await channel.send(preparedWaitlistAlternativeAvailableNotification), {
      outcome: "ACCEPTED",
      providerReference: "alternative-provider-id",
    });
  });

  it("treats 43101 as a known recipient-permission refusal", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const { WeChatSubscriptionMessageError } =
      await import("../../../services/WeChatSubscriptionMessageService");
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      ...unusedActivitySender,
      isWaitlistPromotedConfigured: async () => true,
      sendWaitlistPromotedNotification: async () => {
        throw new WeChatSubscriptionMessageError("subscription revoked", "43101");
      },
    });

    assert.deepEqual(await channel.send(preparedWaitlistPromotedNotification), {
      outcome: "RECIPIENT_PERMISSION_REVOKED",
      errorCode: "43101",
      errorMessage: "subscription revoked",
    });
  });

  it("does not manufacture retry safety for other provider failures", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const { WeChatSubscriptionMessageError } =
      await import("../../../services/WeChatSubscriptionMessageService");
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      ...unusedActivitySender,
      isWaitlistPromotedConfigured: async () => true,
      sendWaitlistPromotedNotification: async () => {
        throw new WeChatSubscriptionMessageError("provider timeout", null);
      },
    });

    assert.deepEqual(await channel.send(preparedWaitlistPromotedNotification), {
      outcome: "AMBIGUOUS",
      errorCode: null,
      errorMessage: "provider timeout",
    });
  });

  it("maps an activity reminder to the provider-neutral prepared sender", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isActivityStartReminderConfigured: async () => true,
      sendActivityStartReminder: async (input) => {
        assert.deepEqual(input, {
          openId: "openid-activity",
          activityName: "徒步 周末白云山",
          startAt: "2026-07-23 10:30",
          location: "白云山南门",
          remark: "提前时间更充足",
          page: "/pr/42",
        });
        return "activity-provider-id";
      },
      isWaitlistPromotedConfigured: async () => false,
      sendWaitlistPromotedNotification: async () => {
        throw new Error("waitlist sender is not expected");
      },
    });

    assert.deepEqual(await channel.send(preparedActivityStartReminderNotification), {
      outcome: "ACCEPTED",
      providerReference: "activity-provider-id",
    });
  });

  it("maps a confirmation reminder to the existing provider template", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isConfirmationReminderConfigured: async () => true,
      sendConfirmationReminder: async (input) => {
        assert.deepEqual(input, {
          openId: "openid-confirmation",
          orderContent: "周末徒步",
          orderNo: "PR-42-000001",
          appointmentAt: "2026-07-23 14:00",
          remark: "请尽快确认参与活动",
          page: "/pr/42",
        });
        return "confirmation-provider-id";
      },
    });
    assert.deepEqual(await channel.send(preparedConfirmationReminderNotification), {
      outcome: "ACCEPTED",
      providerReference: "confirmation-provider-id",
    });
  });

  it("maps a new-partner task to the existing provider template", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isNewPartnerConfigured: async () => true,
      sendNewPartnerNotification: async (input) => {
        assert.deepEqual(input, {
          openId: "openid-new-partner",
          applicantName: "小明",
          teamName: "周末徒步",
          tip: "有新搭子加入",
          appliedAt: "2026-07-23 10:30",
          page: "/pr/42",
        });
        return "new-partner-provider-id";
      },
    });

    assert.deepEqual(await channel.send(preparedNewPartnerNotification), {
      outcome: "ACCEPTED",
      providerReference: "new-partner-provider-id",
    });
  });

  it("maps a meeting-point update to the existing provider template", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isMeetingPointUpdatedConfigured: async () => true,
      sendMeetingPointUpdatedNotification: async (input) => {
        assert.deepEqual(input, {
          openId: "openid-meeting-point",
          updateType: "碰头地点",
          operatorName: "系统",
          updatedAt: "2026-07-23 10:30",
          meetingPointDescription: "白云山南门星巴克门口",
          page: "/pr/42",
        });
        return "meeting-point-provider-id";
      },
    });

    assert.deepEqual(await channel.send(preparedMeetingPointUpdatedNotification), {
      outcome: "ACCEPTED",
      providerReference: "meeting-point-provider-id",
    });
  });

  it("refuses an unconfigured meeting-point update before send", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isMeetingPointUpdatedConfigured: async () => false,
      sendMeetingPointUpdatedNotification: async () => {
        throw new Error("must not call an unconfigured meeting-point channel");
      },
    });

    assert.deepEqual(await channel.send(preparedMeetingPointUpdatedNotification), {
      outcome: "PERMANENT_REFUSAL",
      errorCode: "CHANNEL_NOT_CONFIGURED",
      errorMessage: "Meeting point updated subscription message channel is not configured",
    });
  });

  it("classifies a meeting-point update 43101 as a recipient-permission refusal", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const { WeChatSubscriptionMessageError } =
      await import("../../../services/WeChatSubscriptionMessageService");
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isMeetingPointUpdatedConfigured: async () => true,
      sendMeetingPointUpdatedNotification: async () => {
        throw new WeChatSubscriptionMessageError("subscription revoked", "43101");
      },
    });

    assert.deepEqual(await channel.send(preparedMeetingPointUpdatedNotification), {
      outcome: "RECIPIENT_PERMISSION_REVOKED",
      errorCode: "43101",
      errorMessage: "subscription revoked",
    });
  });

  it("maps a PR-ready task to the existing provider template", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isPRReadyConfigured: async () => true,
      sendPRReadyNotification: async (input) => {
        assert.deepEqual(input, {
          openId: "openid-pr-ready",
          title: "周末徒步",
          type: "徒步",
          status: "已就绪",
          remark: "已成团，可下单；不可直接加入退出",
          page: "/pr/42",
        });
        return "pr-ready-provider-id";
      },
    });

    assert.deepEqual(await channel.send(preparedPRReadyNotification), {
      outcome: "ACCEPTED",
      providerReference: "pr-ready-provider-id",
    });
  });

  it("maps a message-summary task to the PR-message provider template", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isPRMessageConfigured: async () => true,
      sendPRMessageNotification: async (input) => {
        assert.deepEqual(input, {
          openId: "openid-message",
          threadTitle: "周末徒步",
          authorName: "小明",
          sentAt: "2026/07/23 10:30",
          messageSummary: "2条留言，请尽快查看",
          page: "/pr/42",
        });
        return "message-provider-id";
      },
    });

    assert.equal(
      await channel.isConfigured?.({
        template: "pr.message-summary",
        channel: "WECHAT_SUBSCRIPTION",
      }),
      true,
    );
    assert.deepEqual(await channel.send(preparedPRMessageSummaryNotification), {
      outcome: "ACCEPTED",
      providerReference: "message-provider-id",
    });
  });

  it("refuses an unconfigured PR-ready provider before send", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isPRReadyConfigured: async () => false,
      sendPRReadyNotification: async () => {
        throw new Error("must not call an unconfigured PR-ready channel");
      },
    });

    assert.deepEqual(await channel.send(preparedPRReadyNotification), {
      outcome: "PERMANENT_REFUSAL",
      errorCode: "CHANNEL_NOT_CONFIGURED",
      errorMessage: "PR ready subscription message channel is not configured",
    });
  });

  it("classifies a PR-ready 43101 as a recipient-permission refusal", async () => {
    const { createWeChatSubscriptionPreparedNotificationChannel } = await loadAdapter();
    const { WeChatSubscriptionMessageError } =
      await import("../../../services/WeChatSubscriptionMessageService");
    const channel = createWeChatSubscriptionPreparedNotificationChannel({
      isPRReadyConfigured: async () => true,
      sendPRReadyNotification: async () => {
        throw new WeChatSubscriptionMessageError("subscription revoked", "43101");
      },
    });

    assert.deepEqual(await channel.send(preparedPRReadyNotification), {
      outcome: "RECIPIENT_PERMISSION_REVOKED",
      errorCode: "43101",
      errorMessage: "subscription revoked",
    });
  });

  it("retains the pure classifier for callers that only have a normalized failure", async () => {
    const { classifyWeChatSubscriptionNotificationFailure } = await loadAdapter();
    assert.deepEqual(
      classifyWeChatSubscriptionNotificationFailure({
        code: "43101",
        message: "subscription revoked",
      }),
      {
        outcome: "RECIPIENT_PERMISSION_REVOKED",
        errorCode: "43101",
        errorMessage: "subscription revoked",
      },
    );
  });
});
