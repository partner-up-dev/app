import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { NotificationRequest } from "../contracts";
import {
  PR_MESSAGE_SUMMARY_DEBOUNCE_MS,
  createNotificationOwner,
  requestPRMessageSummaryNotification,
} from "./notification-owner.service";
import type {
  NotificationDispatchContextPort,
  NotificationOptionPort,
  NotificationSchedulingContextPort,
  NotificationTaskSchedulerPort,
  NotificationUntilAcknowledgedTaskSchedulerPort,
  NotificationWindowAcknowledgementPort,
  NotificationWindowInvalidationPort,
} from "./ports";
import type { NotificationTask } from "./task";

const recipientUserId = "00000000-0000-4000-8000-000000000001";
const request: NotificationRequest<"pr.message-summary"> = {
  template: "pr.message-summary",
  recipientUserId,
  channel: "WECHAT_SUBSCRIPTION",
  payload: { prId: 42 },
  metadata: {
    aggregate: { type: "partner_request", id: "42" },
    causationId: "partner_request:42:message-window:101",
  },
};

const task: NotificationTask = {
  schemaVersion: 1,
  template: "pr.message-summary",
  recipientUserId,
  channel: "WECHAT_SUBSCRIPTION",
  payload: { prId: 42 },
  aggregate: { type: "partner_request", id: "42" },
  causationId: "partner_request:42:message-window:101",
};

const genericScheduler = (): NotificationTaskSchedulerPort => ({
  enqueueOncePerCause: async () => ({ creation: "CREATED" }),
  replaceActive: async () => ({ creation: "CREATED" }),
  cancelActive: async () => 0,
});

const schedulingContexts: NotificationSchedulingContextPort = {
  resolveActivityStartReminder: async () => ({
    state: "SKIPPED",
    reason: "PR_MISSING_OR_UNSUPPORTED",
  }),
};

const messageSummaryContexts = (): NotificationDispatchContextPort => ({
  resolveActivityStartReminder: async () => ({
    state: "SKIPPED",
    reason: "PR_MISSING_OR_UNSUPPORTED",
  }),
  resolveWaitlistPromoted: async () => ({ state: "SKIPPED", reason: "PR_MISSING" }),
  resolvePRMessageSummary: async () => ({
    state: "READY",
    recipientChannelAddress: "message-openid",
    threadTitle: "周末徒步",
    authorName: "小明",
    sentAt: "2026/07/23 10:30",
    messageSummary: "2条留言，请尽快查看",
    page: "https://app.partner-up.cn/pr/42",
  }),
});

const options = (
  input: {
    onLoad?: () => void;
    onConsume?: () => void;
  } = {},
): NotificationOptionPort => ({
  load: async () => {
    input.onLoad?.();
    return { preferred: true, credit: { kind: "LIMITED", remaining: 1 } };
  },
  consumeLimitedCredit: async () => {
    input.onConsume?.();
    return { consumed: true, remaining: 0 };
  },
  clearRecipientPermission: async () => undefined,
});

const windowInvalidation = (
  input: {
    onExact?: (
      value: Parameters<NotificationWindowInvalidationPort["releaseHeldReservation"]>[0],
    ) => void;
    onPrefix?: (
      value: Parameters<
        NotificationWindowInvalidationPort["releaseHeldReservationsByCreationKeyPrefix"]
      >[0],
    ) => void;
  } = {},
): NotificationWindowInvalidationPort => ({
  releaseHeldReservation: async (value) => {
    input.onExact?.(value);
    return { jobId: 12, released: true, canceled: true };
  },
  releaseHeldReservationsByCreationKeyPrefix: async (value) => {
    input.onPrefix?.(value);
    return { released: 2, canceled: 1, jobIds: [12, 13] };
  },
});

const windowAcknowledgement = (
  input: {
    onAcknowledge?: (
      value: Parameters<NotificationWindowAcknowledgementPort["acknowledgeHeldReservation"]>[0],
    ) => void;
  } = {},
): NotificationWindowAcknowledgementPort => ({
  acknowledgeHeldReservation: async (value) => {
    input.onAcknowledge?.(value);
    return { jobId: 12, released: true, canceled: true, stale: false };
  },
});

describe("PR-message summary Notification owner", () => {
  it("derives the private held-window identity and five-minute debounce", async () => {
    const scheduled: Array<
      Parameters<NotificationUntilAcknowledgedTaskSchedulerPort["enqueueUntilAcknowledged"]>[0]
    > = [];
    const scheduler: NotificationUntilAcknowledgedTaskSchedulerPort = {
      enqueueUntilAcknowledged: async (input) => {
        scheduled.push(input);
        return { creation: "CREATED" };
      },
    };
    const openedAt = new Date("2026-07-23T02:30:00.000Z");

    assert.deepEqual(
      await requestPRMessageSummaryNotification({
        request,
        windowStartCursor: 101,
        windowOpenedAt: openedAt,
        scheduler,
      }),
      { creation: "CREATED" },
    );
    assert.deepEqual(scheduled, [
      {
        task,
        creationKey:
          "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42",
        windowStartCursor: 101,
        highWaterCursor: 101,
        runAt: new Date(openedAt.getTime() + PR_MESSAGE_SUMMARY_DEBOUNCE_MS),
        timing: { resolutionMs: 1_000, earlyToleranceUnits: 0, lateToleranceUnits: -1 },
      },
    ]);
  });

  it("keeps message-window creation out of the ordinary owner command", async () => {
    const owner = createNotificationOwner({
      scheduler: genericScheduler(),
      options: options(),
      schedulingContexts,
      contexts: messageSummaryContexts(),
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
    });

    await assert.rejects(
      () => owner.request(request),
      /PR_MESSAGE_SUMMARY_REQUIRES_TRANSACTION_BOUND_SOURCE/,
    );
  });

  it("maps semantic PR-message invalidation to private exact and recipient key scopes", async () => {
    const exact: Array<
      Parameters<NotificationWindowInvalidationPort["releaseHeldReservation"]>[0]
    > = [];
    const prefixes: Array<
      Parameters<
        NotificationWindowInvalidationPort["releaseHeldReservationsByCreationKeyPrefix"]
      >[0]
    > = [];
    const owner = createNotificationOwner({
      scheduler: genericScheduler(),
      windowInvalidation: windowInvalidation({
        onExact: (value) => exact.push(value),
        onPrefix: (value) => prefixes.push(value),
      }),
      options: options(),
      schedulingContexts,
      contexts: messageSummaryContexts(),
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
    });

    assert.deepEqual(
      await owner.invalidate({
        template: "pr.message-summary",
        recipientUserId,
        scope: { kind: "AGGREGATE", aggregate: { type: "partner_request", id: "42" } },
      }),
      { released: 1, canceled: 1 },
    );
    assert.deepEqual(exact, [
      {
        creationKey:
          "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42",
      },
    ]);

    assert.deepEqual(
      await owner.invalidate({
        template: "pr.message-summary",
        recipientUserId,
        scope: { kind: "RECIPIENT" },
      }),
      { released: 2, canceled: 1 },
    );
    assert.deepEqual(prefixes, [
      {
        creationKeyPrefix:
          "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:",
      },
    ]);
  });

  it("maps semantic acknowledgement to the private held-window identity", async () => {
    const acknowledgements: Array<
      Parameters<NotificationWindowAcknowledgementPort["acknowledgeHeldReservation"]>[0]
    > = [];
    const owner = createNotificationOwner({
      scheduler: genericScheduler(),
      windowAcknowledgement: windowAcknowledgement({
        onAcknowledge: (value) => acknowledgements.push(value),
      }),
      options: options(),
      schedulingContexts,
      contexts: messageSummaryContexts(),
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
    });

    assert.deepEqual(
      await owner.acknowledge({
        template: "pr.message-summary",
        recipientUserId,
        aggregate: { type: "partner_request", id: "42" },
        throughCursor: 101,
      }),
      { released: true, stale: false },
    );
    assert.deepEqual(acknowledgements, [
      {
        creationKey:
          "notification:pr.message-summary:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42",
        throughCursor: 101,
      },
    ]);
  });

  it("skips instead of rendering arbitrary thread history without a claimed window", async () => {
    let optionLoads = 0;
    let channelCalls = 0;
    const owner = createNotificationOwner({
      scheduler: genericScheduler(),
      options: options({ onLoad: () => (optionLoads += 1) }),
      schedulingContexts,
      contexts: messageSummaryContexts(),
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: null };
        },
      },
    });

    assert.deepEqual(await owner.dispatch(task), {
      disposition: "SKIPPED",
      reason: "MESSAGE_RESERVATION_CONTEXT_MISSING",
    });
    assert.equal(optionLoads, 0);
    assert.equal(channelCalls, 0);
  });

  it("does not call the channel or consume credit when an ACK released the claim", async () => {
    let channelCalls = 0;
    let consumeCalls = 0;
    const owner = createNotificationOwner({
      scheduler: genericScheduler(),
      options: options({ onConsume: () => (consumeCalls += 1) }),
      schedulingContexts,
      contexts: messageSummaryContexts(),
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: null };
        },
      },
    });

    assert.deepEqual(
      await owner.dispatch(task, {
        runAt: new Date("2026-07-23T02:35:00.000Z"),
        windowStartCursor: 101,
        isCreationReservationHeld: async () => false,
      }),
      {
        disposition: "SKIPPED",
        reason: "MESSAGE_RESERVATION_RELEASED",
      },
    );
    assert.equal(channelCalls, 0);
    assert.equal(consumeCalls, 0);
  });

  it("skips a terminal PR context before channel I/O or credit consumption", async () => {
    let channelCalls = 0;
    let consumeCalls = 0;
    const owner = createNotificationOwner({
      scheduler: genericScheduler(),
      options: options({ onConsume: () => (consumeCalls += 1) }),
      schedulingContexts,
      contexts: {
        ...messageSummaryContexts(),
        resolvePRMessageSummary: async () => ({ state: "SKIPPED", reason: "PR_TERMINAL" }),
      },
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: null };
        },
      },
    });

    assert.deepEqual(
      await owner.dispatch(task, {
        runAt: new Date("2026-07-23T02:35:00.000Z"),
        windowStartCursor: 101,
        isCreationReservationHeld: async () => true,
      }),
      { disposition: "SKIPPED", reason: "PR_TERMINAL" },
    );
    assert.equal(channelCalls, 0);
    assert.equal(consumeCalls, 0);
  });

  it("safely skips when the runtime has no PR-message context adapter", async () => {
    let channelCalls = 0;
    const owner = createNotificationOwner({
      scheduler: genericScheduler(),
      options: options(),
      schedulingContexts,
      contexts: {
        resolveActivityStartReminder: async () => ({
          state: "SKIPPED",
          reason: "PR_MISSING_OR_UNSUPPORTED",
        }),
        resolveWaitlistPromoted: async () => ({ state: "SKIPPED", reason: "PR_MISSING" }),
      },
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: null };
        },
      },
    });

    assert.deepEqual(
      await owner.dispatch(task, {
        runAt: new Date("2026-07-23T02:35:00.000Z"),
        windowStartCursor: 101,
        isCreationReservationHeld: async () => true,
      }),
      {
        disposition: "SKIPPED",
        reason: "PR_MESSAGE_SUMMARY_NOTIFICATION_CONTEXT_NOT_CONFIGURED",
      },
    );
    assert.equal(channelCalls, 0);
  });

  it("renders the message summary and consumes a limited credit after acceptance", async () => {
    let consumeCalls = 0;
    const owner = createNotificationOwner({
      scheduler: genericScheduler(),
      options: options({ onConsume: () => (consumeCalls += 1) }),
      schedulingContexts,
      contexts: messageSummaryContexts(),
      channel: {
        send: async (message) => {
          assert.deepEqual(message, {
            channel: "WECHAT_SUBSCRIPTION",
            template: "pr.message-summary",
            recipientChannelAddress: "message-openid",
            content: {
              threadTitle: "周末徒步",
              authorName: "小明",
              sentAt: "2026/07/23 10:30",
              messageSummary: "2条留言，请尽快查看",
              page: "https://app.partner-up.cn/pr/42",
            },
          });
          return { outcome: "ACCEPTED", providerReference: "message-provider-id" };
        },
      },
    });

    assert.deepEqual(
      await owner.dispatch(task, {
        runAt: new Date("2026-07-23T02:35:00.000Z"),
        windowStartCursor: 101,
        isCreationReservationHeld: async () => true,
      }),
      {
        disposition: "SUCCEEDED",
        reason: "CHANNEL_ACCEPTED",
        providerReference: "message-provider-id",
      },
    );
    assert.equal(consumeCalls, 1);
  });
});
