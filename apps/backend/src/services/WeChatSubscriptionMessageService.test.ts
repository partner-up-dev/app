import assert from "node:assert/strict";
import { test } from "vitest";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

test("sendPRMessageNotification maps batch summary fields to PR_MESSAGE keywords", async () => {
  const { WeChatSubscriptionMessageService } = await import("./WeChatSubscriptionMessageService");
  const service = new WeChatSubscriptionMessageService();
  type CapturedMessage = {
    kind: string;
    openId: string;
    page: string | null;
    data: Record<string, { value: string }>;
  };
  let captured: CapturedMessage | null = null;

  (
    service as unknown as {
      sendSubscribeMessage: (input: CapturedMessage) => Promise<string | number | null>;
    }
  ).sendSubscribeMessage = async (input) => {
    captured = input;
    return null;
  };

  await service.sendPRMessageNotification({
    openId: "openid-123",
    threadTitle: "周三羽球搭子",
    authorName: "小明",
    sentAt: "2026/04/14 12:30",
    messageSummary: "3条留言，请尽快查看",
    page: "/pr/42",
  });

  assert.deepEqual(captured, {
    kind: "PR_MESSAGE",
    openId: "openid-123",
    page: "/pr/42",
    data: {
      thing5: { value: "周三羽球搭子" },
      time2: { value: "2026/04/14 12:30" },
      name3: { value: "小明" },
      thing4: { value: "3条留言，请尽快查看" },
    },
  });
});

test("sendMeetingPointUpdatedNotification maps meeting point fields to subscription keywords", async () => {
  const { WeChatSubscriptionMessageService } = await import("./WeChatSubscriptionMessageService");
  const service = new WeChatSubscriptionMessageService();
  type CapturedMessage = {
    kind: string;
    openId: string;
    page: string | null;
    data: Record<string, { value: string }>;
  };
  let captured: CapturedMessage | null = null;

  (
    service as unknown as {
      sendSubscribeMessage: (input: CapturedMessage) => Promise<string | number | null>;
    }
  ).sendSubscribeMessage = async (input) => {
    captured = input;
    return null;
  };

  await service.sendMeetingPointUpdatedNotification({
    openId: "openid-456",
    updateType: "碰头地点",
    operatorName: "系统",
    updatedAt: "2026/04/30 20:15",
    meetingPointDescription: "商场南门星巴克门口",
    page: "/pr/177",
  });

  assert.deepEqual(captured, {
    kind: "MEETING_POINT_UPDATED",
    openId: "openid-456",
    page: "/pr/177",
    data: {
      phrase1: { value: "碰头地点" },
      thing2: { value: "系统" },
      time3: { value: "2026/04/30 20:15" },
      thing6: { value: "商场南门星巴克门口" },
    },
  });
});

test("sendWaitlistPromotedNotification maps waitlist fields to subscription keywords", async () => {
  const { WeChatSubscriptionMessageService } = await import("./WeChatSubscriptionMessageService");
  const service = new WeChatSubscriptionMessageService();
  type CapturedMessage = {
    kind: string;
    openId: string;
    page: string | null;
    data: Record<string, { value: string }>;
  };
  let captured: CapturedMessage | null = null;

  (
    service as unknown as {
      sendSubscribeMessage: (input: CapturedMessage) => Promise<string | number | null>;
    }
  ).sendSubscribeMessage = async (input) => {
    captured = input;
    return null;
  };

  await service.sendWaitlistPromotedNotification({
    openId: "openid-789",
    title: "周六羽毛球双打",
    status: "候补成功",
    remark: "已为你保留名额",
    page: "/pr/188",
  });

  assert.deepEqual(captured, {
    kind: "WAITLIST_PROMOTED",
    openId: "openid-789",
    page: "/pr/188",
    data: {
      thing1: { value: "周六羽毛球双打" },
      phrase3: { value: "候补成功" },
      thing4: { value: "已为你保留名额" },
    },
  });
});

test("sendPRReadyNotification maps ready fields to subscription keywords", async () => {
  const { WeChatSubscriptionMessageService } = await import("./WeChatSubscriptionMessageService");
  const service = new WeChatSubscriptionMessageService();
  type CapturedMessage = {
    kind: string;
    openId: string;
    page: string | null;
    data: Record<string, { value: string }>;
  };
  let captured: CapturedMessage | null = null;

  (
    service as unknown as {
      sendSubscribeMessage: (input: CapturedMessage) => Promise<string | number | null>;
    }
  ).sendSubscribeMessage = async (input) => {
    captured = input;
    return null;
  };

  await service.sendPRReadyNotification({
    openId: "openid-ready",
    title: "周五羽球搭子",
    type: "羽毛球",
    status: "已就绪",
    remark: "已成团，可下单；不可直接加入退出",
    page: "/pr/231",
  });

  assert.deepEqual(captured, {
    kind: "PR_READY",
    openId: "openid-ready",
    page: "/pr/231",
    data: {
      thing1: { value: "周五羽球搭子" },
      thing2: { value: "羽毛球" },
      phrase6: { value: "已就绪" },
      thing4: { value: "已成团，可下单；不可直接加入退出" },
    },
  });
});
