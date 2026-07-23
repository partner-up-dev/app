import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { NotificationRequest } from "../contracts";
import { notificationRequestSchema } from "../contracts";
import { createNotificationOwner } from "./notification-owner.service";
import type {
  NotificationChannelSendResult,
  NotificationDispatchContextPort,
  NotificationOptionPort,
  NotificationSchedulingContextPort,
  NotificationTaskSchedulerPort,
} from "./ports";
import type { NotificationTask } from "./task";

const request: NotificationRequest<"pr.waitlist-promoted"> = {
  template: "pr.waitlist-promoted",
  recipientUserId: "00000000-0000-4000-8000-000000000001",
  channel: "WECHAT_SUBSCRIPTION",
  payload: {
    prId: 42,
    partnerId: 7,
    waitlistCycleId: "00000000-0000-4000-8000-000000000007",
  },
  metadata: {
    aggregate: { type: "partner_request", id: "42" },
    causationId: "partner_request:42:waitlist-promotion:7:00000000-0000-4000-8000-000000000007",
  },
};

const invalidTypedRequest: NotificationRequest<"pr.waitlist-promoted"> = {
  ...request,
  payload: {
    prId: 42,
    partnerId: 7,
    waitlistCycleId: "00000000-0000-4000-8000-000000000007",
    // @ts-expect-error A waitlist-promotion payload cannot use another template's candidateId field.
    candidateId: 7,
  },
};
void invalidTypedRequest;

const task: NotificationTask = {
  schemaVersion: 1,
  template: request.template,
  recipientUserId: request.recipientUserId,
  channel: request.channel,
  payload: request.payload,
  aggregate: request.metadata.aggregate,
  causationId: request.metadata.causationId,
};

const activityRequest: NotificationRequest<"pr.activity-start-reminder"> = {
  template: "pr.activity-start-reminder",
  recipientUserId: request.recipientUserId,
  channel: "WECHAT_SUBSCRIPTION",
  payload: { prId: 42, activityStartAt: "2026-07-23T12:00:00+08:00" },
  metadata: {
    aggregate: { type: "partner_request", id: "42" },
    causationId:
      "partner_request:42:activity-start-reminder:00000000-0000-4000-8000-000000000001:2026-07-23T04:00:00.000Z",
  },
};

const activityTask: NotificationTask = {
  schemaVersion: 1,
  template: activityRequest.template,
  recipientUserId: activityRequest.recipientUserId,
  channel: activityRequest.channel,
  payload: { prId: 42, activityStartAt: "2026-07-23T04:00:00.000Z" },
  aggregate: activityRequest.metadata.aggregate,
  causationId: activityRequest.metadata.causationId,
};

const readyContexts: NotificationDispatchContextPort = {
  resolveActivityStartReminder: async () => ({
    state: "READY",
    recipientChannelAddress: "wechat-activity-open-id",
    activityStartAt: "2026-07-23T04:00:00.000Z",
    activityName: "徒步 周末白云山",
    location: "白云山南门",
    page: "https://app.partner-up.cn/pr/42",
  }),
  resolveWaitlistPromoted: async () => ({
    state: "READY",
    recipientChannelAddress: "wechat-open-id",
    title: "A real promotion",
    page: "https://app.partner-up.cn/pr/42",
  }),
};

const readySchedulingContexts: NotificationSchedulingContextPort = {
  resolveActivityStartReminder: async () => ({
    state: "READY",
    activityStartAt: "2026-07-23T04:00:00.000Z",
  }),
};

const eligibleOptions = (): NotificationOptionPort => ({
  load: async () => ({ preferred: true, credit: { kind: "LIMITED", remaining: 1 } }),
  consumeLimitedCredit: async () => ({ consumed: true, remaining: 0 }),
  clearRecipientPermission: async () => undefined,
});

const scheduler = (
  captured: Array<Parameters<NotificationTaskSchedulerPort["enqueueOncePerCause"]>[0]>,
  replacements: Array<Parameters<NotificationTaskSchedulerPort["replaceActive"]>[0]> = [],
  cancellations: Array<Parameters<NotificationTaskSchedulerPort["cancelActive"]>[0]> = [],
) =>
  ({
    enqueueOncePerCause: async (input) => {
      captured.push(input);
      return { creation: "CREATED" as const };
    },
    replaceActive: async (input) => {
      replacements.push(input);
      return { creation: "CREATED" as const };
    },
    cancelActive: async (input) => {
      cancellations.push(input);
      return 1;
    },
  }) satisfies NotificationTaskSchedulerPort;

describe("Notification owner", () => {
  it("derives exact activity timing and stable private replacement identity", async () => {
    const replacements: Array<Parameters<NotificationTaskSchedulerPort["replaceActive"]>[0]> = [];
    let schedulingLoads = 0;
    let dispatchLoads = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([], replacements),
      options: eligibleOptions(),
      schedulingContexts: {
        resolveActivityStartReminder: async () => {
          schedulingLoads += 1;
          return { state: "READY", activityStartAt: "2026-07-23T04:00:00.000Z" };
        },
      },
      contexts: {
        resolveActivityStartReminder: async () => {
          dispatchLoads += 1;
          return readyContexts.resolveActivityStartReminder(activityTask);
        },
        resolveWaitlistPromoted: readyContexts.resolveWaitlistPromoted,
      },
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date("2026-07-23T03:00:00.000Z"),
    });

    assert.deepEqual(await owner.request(activityRequest), { creation: "CREATED" });
    assert.deepEqual(await owner.request(activityRequest), { creation: "CREATED" });
    assert.equal(schedulingLoads, 2);
    assert.equal(dispatchLoads, 0);
    assert.equal(replacements.length, 2);
    assert.deepEqual(replacements[0], replacements[1]);
    assert.deepEqual(replacements[0], {
      task: activityTask,
      coordinationKey:
        "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
      activeKeyPrefix:
        "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:",
      scheduleKey:
        "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:2026-07-23T04:00:00.000Z",
      runAt: new Date("2026-07-23T03:40:00.000Z"),
      timing: { resolutionMs: 1_000, earlyToleranceUnits: 0, lateToleranceUnits: -1 },
    });
  });

  it("cancels instead of creating activity work when current eligibility is stale", async () => {
    const replacements: Array<Parameters<NotificationTaskSchedulerPort["replaceActive"]>[0]> = [];
    const cancellations: Array<Parameters<NotificationTaskSchedulerPort["cancelActive"]>[0]> = [];
    const owner = createNotificationOwner({
      scheduler: scheduler([], replacements, cancellations),
      options: eligibleOptions(),
      schedulingContexts: {
        resolveActivityStartReminder: async () => ({
          state: "READY",
          activityStartAt: "2026-07-23T05:00:00.000Z",
        }),
      },
      contexts: readyContexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date("2026-07-23T03:00:00.000Z"),
    });

    assert.deepEqual(await owner.request(activityRequest), { creation: "CANCELED" });
    assert.equal(replacements.length, 0);
    assert.deepEqual(cancellations, [
      {
        coordinationKey:
          "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
        activeKeyPrefix:
          "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:",
      },
    ]);

    const preferenceIneligibleOwner = createNotificationOwner({
      scheduler: scheduler([], replacements, cancellations),
      options: {
        ...eligibleOptions(),
        load: async () => ({ preferred: false, credit: { kind: "LIMITED", remaining: 1 } }),
      },
      schedulingContexts: readySchedulingContexts,
      contexts: readyContexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date("2026-07-23T03:00:00.000Z"),
    });
    assert.deepEqual(await preferenceIneligibleOwner.request(activityRequest), {
      creation: "CANCELED",
    });
    assert.equal(replacements.length, 0);
    assert.equal(cancellations.length, 2);

    assert.deepEqual(
      await owner.cancel({
        template: "pr.activity-start-reminder",
        recipientUserId: activityRequest.recipientUserId,
        scope: {
          kind: "AGGREGATE",
          aggregate: { type: "partner_request", id: "42" },
        },
      }),
      { canceled: 1 },
    );
    assert.equal(cancellations.length, 3);

    assert.deepEqual(
      await owner.cancel({
        template: "pr.activity-start-reminder",
        recipientUserId: activityRequest.recipientUserId,
        scope: { kind: "RECIPIENT" },
      }),
      { canceled: 1 },
    );
    assert.deepEqual(cancellations[3], {
      coordinationKey:
        "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
      activeKeyPrefix:
        "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
    });
  });

  it("revokes a replacement when preference changes after the serialized write", async () => {
    const replacements: Array<Parameters<NotificationTaskSchedulerPort["replaceActive"]>[0]> = [];
    const cancellations: Array<Parameters<NotificationTaskSchedulerPort["cancelActive"]>[0]> = [];
    let optionLoads = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([], replacements, cancellations),
      options: {
        ...eligibleOptions(),
        load: async () => {
          optionLoads += 1;
          return optionLoads === 1
            ? { preferred: true, credit: { kind: "LIMITED", remaining: 1 } }
            : { preferred: false, credit: { kind: "LIMITED", remaining: 1 } };
        },
      },
      schedulingContexts: readySchedulingContexts,
      contexts: readyContexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date("2026-07-23T03:00:00.000Z"),
    });

    assert.deepEqual(await owner.request(activityRequest), { creation: "CANCELED" });
    assert.equal(optionLoads, 2);
    assert.equal(replacements.length, 1);
    assert.deepEqual(cancellations, [
      {
        coordinationKey:
          "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
        activeKeyPrefix:
          "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:",
      },
    ]);
  });

  it("revalidates and sends a current activity reminder, preserving final-credit preference", async () => {
    let consumed = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([]),
      options: {
        ...eligibleOptions(),
        consumeLimitedCredit: async () => {
          consumed += 1;
          return { consumed: true, remaining: 0 };
        },
      },
      schedulingContexts: readySchedulingContexts,
      contexts: readyContexts,
      channel: {
        send: async (message) => {
          assert.deepEqual(message, {
            channel: "WECHAT_SUBSCRIPTION",
            template: "pr.activity-start-reminder",
            recipientChannelAddress: "wechat-activity-open-id",
            content: {
              activityName: "徒步 周末白云山",
              startAt: "2026-07-23 12:00",
              location: "白云山南门",
              remark: "提前时间更充足",
              page: "https://app.partner-up.cn/pr/42",
            },
          });
          return { outcome: "ACCEPTED", providerReference: "activity-provider-1" };
        },
      },
      now: () => new Date("2026-07-23T03:40:00.000Z"),
    });

    assert.deepEqual(await owner.dispatch(activityTask), {
      disposition: "SUCCEEDED",
      reason: "CHANNEL_ACCEPTED",
      providerReference: "activity-provider-1",
    });
    assert.equal(consumed, 1);
  });

  it("clears activity preference and credit and invalidates recipient work on 43101", async () => {
    const cancellations: Array<Parameters<NotificationTaskSchedulerPort["cancelActive"]>[0]> = [];
    let clears = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([], [], cancellations),
      options: {
        ...eligibleOptions(),
        clearRecipientPermission: async () => {
          clears += 1;
        },
      },
      schedulingContexts: readySchedulingContexts,
      contexts: readyContexts,
      channel: {
        send: async () => ({
          outcome: "RECIPIENT_PERMISSION_REVOKED",
          errorCode: "43101",
          errorMessage: "user refuse to accept the msg",
        }),
      },
      now: () => new Date("2026-07-23T03:40:00.000Z"),
    });

    assert.deepEqual(await owner.dispatch(activityTask), {
      disposition: "PERMANENT_FAILURE",
      reason: "RECIPIENT_PERMISSION_REVOKED",
    });
    assert.equal(clears, 1);
    assert.deepEqual(cancellations, [
      {
        coordinationKey:
          "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
        activeKeyPrefix:
          "notification-active:pr.activity-start-reminder:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
      },
    ]);
  });

  it("skips stale activity membership or changed activity time before channel I/O", async () => {
    let channelCalls = 0;
    const createOwner = (contexts: NotificationDispatchContextPort) =>
      createNotificationOwner({
        scheduler: scheduler([]),
        options: eligibleOptions(),
        schedulingContexts: readySchedulingContexts,
        contexts,
        channel: {
          send: async () => {
            channelCalls += 1;
            return { outcome: "ACCEPTED", providerReference: null };
          },
        },
        now: () => new Date("2026-07-23T03:40:00.000Z"),
      });

    const staleMember = createOwner({
      resolveActivityStartReminder: async () => ({
        state: "SKIPPED",
        reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
      }),
      resolveWaitlistPromoted: readyContexts.resolveWaitlistPromoted,
    });
    assert.deepEqual(await staleMember.dispatch(activityTask), {
      disposition: "SKIPPED",
      reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
    });

    const changedTime = createOwner({
      resolveActivityStartReminder: async () => ({
        state: "READY",
        recipientChannelAddress: "wechat-activity-open-id",
        activityStartAt: "2026-07-23T05:00:00.000Z",
        activityName: "徒步 周末白云山",
        location: "白云山南门",
        page: "https://app.partner-up.cn/pr/42",
      }),
      resolveWaitlistPromoted: readyContexts.resolveWaitlistPromoted,
    });
    assert.deepEqual(await changedTime.dispatch(activityTask), {
      disposition: "SKIPPED",
      reason: "ACTIVITY_START_CHANGED",
    });
    assert.equal(channelCalls, 0);
  });

  it("rejects a runtime template/payload mismatch and schedules only private task policy", async () => {
    assert.equal(
      notificationRequestSchema.safeParse({
        ...request,
        payload: { prId: 42, candidateId: 7 },
      }).success,
      false,
    );

    const scheduled: Array<Parameters<NotificationTaskSchedulerPort["enqueueOncePerCause"]>[0]> =
      [];
    let optionLoads = 0;
    let contextLoads = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler(scheduled),
      options: {
        ...eligibleOptions(),
        load: async () => {
          optionLoads += 1;
          return { preferred: true, credit: { kind: "LIMITED", remaining: 1 } };
        },
      },
      schedulingContexts: readySchedulingContexts,
      contexts: {
        resolveActivityStartReminder: readyContexts.resolveActivityStartReminder,
        resolveWaitlistPromoted: async () => {
          contextLoads += 1;
          return readyContexts.resolveWaitlistPromoted(task);
        },
      },
      channel: {
        send: async () => ({ outcome: "ACCEPTED", providerReference: "provider-1" }),
      },
      now: () => new Date("2026-07-22T10:00:00.000Z"),
    });

    const result = await owner.request(request);

    assert.deepEqual(result, { creation: "CREATED" });
    assert.equal(optionLoads, 0);
    assert.equal(contextLoads, 0);
    assert.equal(scheduled.length, 1);
    assert.deepEqual(scheduled[0], {
      task,
      creationKey:
        "notification:pr.waitlist-promoted:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:7:00000000-0000-4000-8000-000000000007",
      runAt: new Date("2026-07-22T10:00:00.000Z"),
      timing: { resolutionMs: 1_000, earlyToleranceUnits: 0, lateToleranceUnits: -1 },
    });
  });

  it("dispatches a current eligible promotion once and preserves preference after credit use", async () => {
    let consumed = 0;
    let renderedRecipient = "";
    const owner = createNotificationOwner({
      scheduler: scheduler([]),
      options: {
        ...eligibleOptions(),
        consumeLimitedCredit: async () => {
          consumed += 1;
          return { consumed: true, remaining: 0 };
        },
      },
      schedulingContexts: readySchedulingContexts,
      contexts: readyContexts,
      channel: {
        send: async (message) => {
          renderedRecipient = message.recipientChannelAddress;
          assert.deepEqual(message.content, {
            title: "A real promotion",
            status: "候补成功",
            remark: "已为你保留名额",
            page: "https://app.partner-up.cn/pr/42",
          });
          return { outcome: "ACCEPTED", providerReference: "provider-1" };
        },
      },
    });

    assert.deepEqual(await owner.dispatch(task), {
      disposition: "SUCCEEDED",
      reason: "CHANNEL_ACCEPTED",
      providerReference: "provider-1",
    });
    assert.equal(renderedRecipient, "wechat-open-id");
    assert.equal(consumed, 1);
  });

  it("skips before channel I/O for preference/credit and stale current context", async () => {
    let contextLoads = 0;
    let channelCalls = 0;
    const preferenceIneligible = createNotificationOwner({
      scheduler: scheduler([]),
      options: {
        ...eligibleOptions(),
        load: async () => ({ preferred: false, credit: { kind: "LIMITED", remaining: 3 } }),
      },
      schedulingContexts: readySchedulingContexts,
      contexts: {
        resolveActivityStartReminder: readyContexts.resolveActivityStartReminder,
        resolveWaitlistPromoted: async () => {
          contextLoads += 1;
          return readyContexts.resolveWaitlistPromoted(task);
        },
      },
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: null };
        },
      },
    });
    assert.deepEqual(await preferenceIneligible.dispatch(task), {
      disposition: "SKIPPED",
      reason: "NOTIFICATION_PREFERENCE_OR_CREDIT_INELIGIBLE",
    });
    assert.equal(contextLoads, 0);
    assert.equal(channelCalls, 0);

    const stalePromotion = createNotificationOwner({
      scheduler: scheduler([]),
      options: eligibleOptions(),
      schedulingContexts: readySchedulingContexts,
      contexts: {
        resolveActivityStartReminder: readyContexts.resolveActivityStartReminder,
        resolveWaitlistPromoted: async () => ({
          state: "SKIPPED",
          reason: "WAITLIST_CYCLE_SUPERSEDED",
        }),
      },
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: null };
        },
      },
    });
    assert.deepEqual(await stalePromotion.dispatch(task), {
      disposition: "SKIPPED",
      reason: "WAITLIST_CYCLE_SUPERSEDED",
    });
    assert.equal(channelCalls, 0);
  });

  it("maps known refusal, proven retry and ambiguity without inventing a retry", async () => {
    const cases: Array<{
      channelResult: NotificationChannelSendResult;
      expected: { disposition: string; reason: string };
      expectedClears: number;
    }> = [
      {
        channelResult: {
          outcome: "RECIPIENT_PERMISSION_REVOKED",
          errorCode: "43101",
          errorMessage: "revoked",
        },
        expected: { disposition: "PERMANENT_FAILURE", reason: "RECIPIENT_PERMISSION_REVOKED" },
        expectedClears: 1,
      },
      {
        channelResult: {
          outcome: "PROVEN_NOT_APPLIED_RETRYABLE",
          errorCode: "KNOWN_NOT_APPLIED",
          errorMessage: "safe",
        },
        expected: { disposition: "RETRYABLE_FAILURE", reason: "CHANNEL_PROVEN_NOT_APPLIED" },
        expectedClears: 0,
      },
      {
        channelResult: { outcome: "AMBIGUOUS", errorCode: null, errorMessage: "timeout" },
        expected: { disposition: "PERMANENT_FAILURE", reason: "AMBIGUOUS_PROVIDER_OUTCOME" },
        expectedClears: 0,
      },
    ];

    for (const testCase of cases) {
      let clears = 0;
      const owner = createNotificationOwner({
        scheduler: scheduler([]),
        options: {
          ...eligibleOptions(),
          clearRecipientPermission: async () => {
            clears += 1;
          },
        },
        schedulingContexts: readySchedulingContexts,
        contexts: readyContexts,
        channel: { send: async () => testCase.channelResult },
      });

      const result = await owner.dispatch(task);
      assert.equal(result.disposition, testCase.expected.disposition);
      assert.equal(result.reason, testCase.expected.reason);
      assert.equal(clears, testCase.expectedClears);
    }
  });
});
