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

const request: NotificationRequest<"pr.waitlist-alternative-available"> = {
  template: "pr.waitlist-alternative-available",
  recipientUserId: "00000000-0000-4000-8000-000000000001",
  channel: "WECHAT_SUBSCRIPTION",
  payload: {
    sourcePrId: 42,
    sourcePartnerId: 7,
    sourceWaitlistCycleId: "00000000-0000-4000-8000-000000000007",
    candidatePrId: 99,
  },
  metadata: {
    aggregate: { type: "partner_request", id: "42" },
    causationId:
      "partner_request:42:waitlist-alternative:7:00000000-0000-4000-8000-000000000007:99",
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
  resolveWaitlistAlternativeAvailable: async () => ({
    state: "READY",
    recipientChannelAddress: "wechat-alternative-open-id",
    title: "周末徒步",
    page: "https://app.partner-up.cn/pr/99",
  }),
};

const options = (
  input: {
    onConsume?: () => void;
  } = {},
): NotificationOptionPort => ({
  load: async () => ({ preferred: true, credit: { kind: "LIMITED", remaining: 1 } }),
  consumeLimitedCredit: async () => {
    input.onConsume?.();
    return { consumed: true, remaining: 0 };
  },
  clearRecipientPermission: async () => undefined,
});

const scheduler = (
  replacements: Array<Parameters<NotificationTaskSchedulerPort["replaceActive"]>[0]>,
): NotificationTaskSchedulerPort => ({
  enqueueOncePerCause: async () => ({ creation: "CREATED" }),
  replaceActive: async (input) => {
    replacements.push(input);
    return { creation: replacements.length === 1 ? "CREATED" : "COALESCED" };
  },
  cancelActive: async () => 0,
});

describe("waitlist-alternative-available Notification owner", () => {
  it("uses source cycle plus candidate as a private active-only recovery identity", async () => {
    const replacements: Array<Parameters<NotificationTaskSchedulerPort["replaceActive"]>[0]> = [];
    const owner = createNotificationOwner({
      scheduler: scheduler(replacements),
      options: options(),
      schedulingContexts,
      contexts: baseContexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date("2026-07-23T03:00:00.000Z"),
    });

    assert.deepEqual(await owner.request(request), { creation: "CREATED" });
    assert.deepEqual(await owner.request(request), { creation: "COALESCED" });
    assert.equal(replacements.length, 2);
    assert.deepEqual(replacements[0], {
      task,
      coordinationKey:
        "notification-active:pr.waitlist-alternative-available:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:7:00000000-0000-4000-8000-000000000007:99:",
      activeKeyPrefix:
        "notification-active:pr.waitlist-alternative-available:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:7:00000000-0000-4000-8000-000000000007:99:",
      scheduleKey:
        "notification-active:pr.waitlist-alternative-available:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:7:00000000-0000-4000-8000-000000000007:99:",
      runAt: new Date("2026-07-23T03:00:00.000Z"),
      timing: { resolutionMs: 1_000, earlyToleranceUnits: 0, lateToleranceUnits: -1 },
    });
    assert.deepEqual(replacements[1], replacements[0]);
  });

  it("renders the business template through the promoted-provider binding and consumes credit", async () => {
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
            template: "pr.waitlist-alternative-available",
            recipientChannelAddress: "wechat-alternative-open-id",
            content: {
              title: "周末徒步",
              status: "有可加入名额",
              remark: "同类同地点有其它 PR 可加入",
              page: "https://app.partner-up.cn/pr/99",
            },
          });
          return { outcome: "ACCEPTED", providerReference: "alternative-provider-id" };
        },
      },
    });

    assert.deepEqual(await owner.dispatch(task), {
      disposition: "SUCCEEDED",
      reason: "CHANNEL_ACCEPTED",
      providerReference: "alternative-provider-id",
    });
    assert.equal(consumed, 1);
  });

  it("fences a superseded source cycle before channel or credit mutation", async () => {
    let channelCalls = 0;
    let consumed = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([]),
      options: options({ onConsume: () => (consumed += 1) }),
      schedulingContexts,
      contexts: {
        ...baseContexts,
        resolveWaitlistAlternativeAvailable: async () => ({
          state: "SKIPPED",
          reason: "SOURCE_WAITLIST_CYCLE_SUPERSEDED",
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
      reason: "SOURCE_WAITLIST_CYCLE_SUPERSEDED",
    });
    assert.equal(channelCalls, 0);
    assert.equal(consumed, 0);
  });
});
