import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { NotificationRequest } from "../contracts";
import { createNotificationOwner } from "./notification-owner.service";
import type {
  NotificationDispatchContextPort,
  NotificationOptionPort,
  NotificationSchedulingContextPort,
  NotificationTaskSchedulerPort,
} from "./ports";
import type { NotificationTask } from "./task";

const request: NotificationRequest<"pr.ready"> = {
  template: "pr.ready",
  recipientUserId: "00000000-0000-4000-8000-000000000001",
  channel: "WECHAT_SUBSCRIPTION",
  payload: {
    prId: 42,
    readyCycleId: "00000000-0000-4000-8000-000000000042",
  },
  metadata: {
    aggregate: { type: "partner_request", id: "42" },
    causationId: "partner_request:42:ready:00000000-0000-4000-8000-000000000042",
  },
};

const task: NotificationTask = {
  schemaVersion: 1,
  template: request.template,
  recipientUserId: request.recipientUserId,
  channel: request.channel,
  payload: request.payload,
  aggregate: request.metadata.aggregate,
  causationId: request.metadata.causationId,
};

const schedulingContexts: NotificationSchedulingContextPort = {
  resolveActivityStartReminder: async () => ({
    state: "SKIPPED",
    reason: "PR_MISSING_OR_UNSUPPORTED",
  }),
};

const baseContexts: NotificationDispatchContextPort = {
  resolveActivityStartReminder: async () => ({
    state: "SKIPPED",
    reason: "PR_MISSING_OR_UNSUPPORTED",
  }),
  resolveWaitlistPromoted: async () => ({ state: "SKIPPED", reason: "PR_MISSING" }),
  resolvePRReady: async () => ({
    state: "READY",
    recipientChannelAddress: "wechat-pr-ready-open-id",
    title: "周末徒步",
    type: "徒步",
    page: "/pr/42",
  }),
};

const options = (
  input: {
    onConsume?: () => void;
    preferred?: boolean;
  } = {},
): NotificationOptionPort => ({
  load: async () => ({
    preferred: input.preferred ?? true,
    credit: { kind: "LIMITED", remaining: 1 },
  }),
  consumeLimitedCredit: async () => {
    input.onConsume?.();
    return { consumed: true, remaining: 0 };
  },
  clearRecipientPermission: async () => undefined,
});

const scheduler = (
  enqueued: Array<Parameters<NotificationTaskSchedulerPort["enqueueOncePerCause"]>[0]>,
): NotificationTaskSchedulerPort => ({
  enqueueOncePerCause: async (input) => {
    enqueued.push(input);
    return { creation: "CREATED" };
  },
  replaceActive: async () => ({ creation: "CREATED" }),
  cancelActive: async () => 0,
});

describe("PR-ready Notification owner", () => {
  it("derives one private once-per-cause task from a durable ready cycle", async () => {
    const enqueued: Array<Parameters<NotificationTaskSchedulerPort["enqueueOncePerCause"]>[0]> = [];
    const owner = createNotificationOwner({
      scheduler: scheduler(enqueued),
      options: options(),
      schedulingContexts,
      contexts: baseContexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date("2026-07-23T03:00:00.000Z"),
    });

    assert.deepEqual(await owner.request(request), { creation: "CREATED" });
    assert.equal(enqueued.length, 1);
    assert.deepEqual(enqueued[0], {
      task,
      creationKey:
        "notification:pr.ready:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:00000000-0000-4000-8000-000000000042",
      runAt: new Date("2026-07-23T03:00:00.000Z"),
      timing: { resolutionMs: 1_000, earlyToleranceUnits: 0, lateToleranceUnits: -1 },
    });
  });

  it("renders current PR-ready context and consumes only limited credit", async () => {
    let consumed = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([]),
      options: options({ onConsume: () => (consumed += 1) }),
      schedulingContexts,
      contexts: baseContexts,
      channel: {
        send: async (message) => {
          assert.deepEqual(message, {
            channel: "WECHAT_SUBSCRIPTION",
            template: "pr.ready",
            recipientChannelAddress: "wechat-pr-ready-open-id",
            content: {
              title: "周末徒步",
              type: "徒步",
              status: "已就绪",
              remark: "已成团，可下单；不可直接加入退出",
              page: "/pr/42",
            },
          });
          return { outcome: "ACCEPTED", providerReference: "pr-ready-provider-id" };
        },
      },
    });

    assert.deepEqual(await owner.dispatch(task), {
      disposition: "SUCCEEDED",
      reason: "CHANNEL_ACCEPTED",
      providerReference: "pr-ready-provider-id",
    });
    assert.equal(consumed, 1);
  });

  it("skips a superseded READY cycle before channel or credit mutation", async () => {
    let channelCalls = 0;
    let consumed = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([]),
      options: options({ onConsume: () => (consumed += 1) }),
      schedulingContexts,
      contexts: {
        ...baseContexts,
        resolvePRReady: async () => ({
          state: "SKIPPED",
          reason: "PR_READY_CYCLE_SUPERSEDED",
        }),
      },
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: "unexpected" };
        },
      },
    });

    assert.deepEqual(await owner.dispatch(task), {
      disposition: "SKIPPED",
      reason: "PR_READY_CYCLE_SUPERSEDED",
    });
    assert.equal(channelCalls, 0);
    assert.equal(consumed, 0);
  });
});
