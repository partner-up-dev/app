import assert from "node:assert/strict";
import { test } from "vitest";
import type { PartnerRequest } from "../../entities/partner-request";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

test("resolvePRMessageNotificationRunAt adds a fixed debounce window", async () => {
  const { PR_MESSAGE_DEBOUNCE_WINDOW_MS, resolvePRMessageNotificationRunAt } =
    await import("../../domains/notification");

  const firstUnreadMessageCreatedAt = new Date("2026-04-14T04:00:00.000Z");
  const runAt = resolvePRMessageNotificationRunAt(firstUnreadMessageCreatedAt);

  assert.equal(
    runAt.toISOString(),
    new Date(firstUnreadMessageCreatedAt.getTime() + PR_MESSAGE_DEBOUNCE_WINDOW_MS).toISOString(),
  );
});

test("scheduleWeChatPRMessageNotification uses delayed runAt and wave payload", async () => {
  const { scheduleWeChatPRMessageNotification } = await import("./wechat-pr-message");
  const { jobRunner } = await import("../jobs");

  type ScheduleConfig = {
    jobType: string;
    runAt: Date;
    dedupeKey?: string | null;
    payload?: Record<string, unknown>;
  };

  const originalScheduleOnce = jobRunner.scheduleOnce.bind(jobRunner);
  let captured: ScheduleConfig | null = null;

  (
    jobRunner as unknown as {
      scheduleOnce: (config: ScheduleConfig) => Promise<{
        inserted: boolean;
        deduped: boolean;
        jobId: number | null;
      }>;
    }
  ).scheduleOnce = async (config) => {
    captured = config;
    return {
      inserted: true,
      deduped: false,
      jobId: 123,
    };
  };

  try {
    const firstUnreadMessageCreatedAt = new Date("2026-04-14T04:00:00.000Z");
    const request = {
      id: 42,
      title: "周三羽球搭子",
      type: "运动",
    } as unknown as PartnerRequest;

    await scheduleWeChatPRMessageNotification({
      request,
      recipientUserId: 8 as never,
      authorUserId: 9 as never,
      waveStartMessageId: 77,
      firstUnreadMessageCreatedAt,
    });
  } finally {
    (
      jobRunner as unknown as {
        scheduleOnce: typeof originalScheduleOnce;
      }
    ).scheduleOnce = originalScheduleOnce;
  }

  if (!captured) {
    throw new Error("Expected scheduleOnce to be called");
  }
  const scheduledConfig = captured as ScheduleConfig;

  assert.equal(scheduledConfig.jobType, "wechat.notification.pr-message");
  assert.equal(scheduledConfig.runAt.toISOString(), "2026-04-14T04:05:00.000Z");
  assert.equal(scheduledConfig.dedupeKey, "wechat-pr-message:8:42:77");
  assert.deepEqual(scheduledConfig.payload, {
    prId: 42,
    recipientUserId: 8,
    waveStartAuthorUserId: 9,
    waveStartMessageId: 77,
    firstUnreadMessageCreatedAtIso: "2026-04-14T04:00:00.000Z",
    scheduledAtIso: "2026-04-14T04:05:00.000Z",
  });
});
