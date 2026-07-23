import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { NotificationRequest } from "../contracts";
import { createNotificationOwner } from "./notification-owner.service";
import type {
  NotificationChannelSendResult,
  NotificationDispatchContextPort,
  NotificationOptionPort,
  NotificationSchedulingContextPort,
  NotificationTaskSchedulerPort,
} from "./ports";
import type { NotificationTask } from "./task";

const recipientUserId = "00000000-0000-4000-8000-000000000001";
const request = (
  reminder: "CONFIRM_START" | "CONFIRM_END_MINUS_30M",
): NotificationRequest<"pr.confirmation-reminder"> => ({
  template: "pr.confirmation-reminder",
  recipientUserId,
  channel: "WECHAT_SUBSCRIPTION",
  payload: { prId: 42, slotId: 7, reminder },
  metadata: {
    aggregate: { type: "partner_request", id: "42" },
    causationId: `confirm:${reminder}`,
  },
});

const anchors = {
  state: "READY" as const,
  confirmationStartAt: "2026-07-23T04:00:00.000Z",
  confirmationEndAt: "2026-07-23T05:00:00.000Z",
};
const schedulingContexts: NotificationSchedulingContextPort = {
  resolveActivityStartReminder: async () => ({
    state: "SKIPPED",
    reason: "ACTIVITY_START_UNAVAILABLE",
  }),
  resolveConfirmationReminder: async () => anchors,
};
const dispatchContext = {
  ...anchors,
  title: "周末徒步",
  activityStartAt: "2026-07-23T06:00:00.000Z",
  recipientChannelAddress: "openid-1",
  page: "/pr/42",
};
const contexts: NotificationDispatchContextPort = {
  resolveActivityStartReminder: async () => ({
    state: "SKIPPED",
    reason: "ACTIVITY_START_UNAVAILABLE",
  }),
  resolveWaitlistPromoted: async () => ({ state: "SKIPPED", reason: "PR_MISSING" }),
  resolveConfirmationReminder: async () => dispatchContext,
};
const options = (
  load: NotificationOptionPort["load"] = async () => ({
    preferred: true,
    credit: { kind: "LIMITED" as const, remaining: 1 },
  }),
): NotificationOptionPort => ({
  load,
  consumeLimitedCredit: async () => ({ consumed: true, remaining: 0 }),
  clearRecipientPermission: async () => undefined,
});

describe("confirmation reminder Notification owner", () => {
  it("derives independent trigger runAt, timing and slot-safe identities", async () => {
    const replacements: Array<Parameters<NotificationTaskSchedulerPort["replaceActive"]>[0]> = [];
    const scheduler: NotificationTaskSchedulerPort = {
      enqueueOncePerCause: async () => ({ creation: "CREATED" }),
      replaceActive: async (input) => {
        replacements.push(input);
        return { creation: "CREATED" };
      },
      cancelActive: async () => 0,
    };
    const owner = createNotificationOwner({
      scheduler,
      options: options(),
      schedulingContexts,
      contexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date("2026-07-23T03:00:00.000Z"),
    });
    await owner.request(request("CONFIRM_START"));
    await owner.request(request("CONFIRM_END_MINUS_30M"));
    assert.equal(replacements[0]?.runAt.toISOString(), "2026-07-23T04:00:00.000Z");
    assert.equal(replacements[1]?.runAt.toISOString(), "2026-07-23T04:30:00.000Z");
    assert.deepEqual(replacements[0]?.timing, {
      resolutionMs: 1,
      earlyToleranceUnits: 0,
      lateToleranceUnits: -1,
    });
    assert.deepEqual(replacements[1]?.timing, {
      resolutionMs: 300000,
      earlyToleranceUnits: 3,
      lateToleranceUnits: -1,
    });
    assert.match(replacements[0]?.scheduleKey ?? "", /:7:2026-07-23T04:00:00.000Z$/);
    assert.notEqual(replacements[0]?.activeKeyPrefix, replacements[1]?.activeKeyPrefix);
  });

  it("skips a stale claimed runAt before channel or credit", async () => {
    let channelCalls = 0;
    let creditCalls = 0;
    const cancellations: Array<Parameters<NotificationTaskSchedulerPort["cancelActive"]>[0]> = [];
    const scheduler: NotificationTaskSchedulerPort = {
      enqueueOncePerCause: async () => ({ creation: "CREATED" }),
      replaceActive: async () => ({ creation: "CREATED" }),
      cancelActive: async (input) => {
        cancellations.push(input);
        return 1;
      },
    };
    const owner = createNotificationOwner({
      scheduler,
      options: {
        ...options(),
        consumeLimitedCredit: async () => {
          creditCalls += 1;
          return { consumed: true, remaining: 0 };
        },
      },
      schedulingContexts,
      contexts,
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: null };
        },
      },
      now: () => new Date("2026-07-23T04:00:00.000Z"),
    });
    const task: NotificationTask = {
      schemaVersion: 1,
      template: "pr.confirmation-reminder",
      recipientUserId,
      channel: "WECHAT_SUBSCRIPTION",
      payload: request("CONFIRM_START").payload,
      aggregate: { type: "partner_request", id: "42" },
      causationId: "confirm:stale",
    };
    assert.deepEqual(await owner.dispatch(task, { runAt: new Date("2026-07-23T03:59:00.000Z") }), {
      disposition: "SKIPPED",
      reason: "CONFIRMATION_REMINDER_CHANGED",
    });
    assert.equal(channelCalls, 0);
    assert.equal(creditCalls, 0);
    assert.equal(cancellations.length, 0);
  });

  it("aggregate-cancels when the second scheduling revalidation becomes globally ineligible", async () => {
    let schedulingLoads = 0;
    const cancellations: Array<Parameters<NotificationTaskSchedulerPort["cancelActive"]>[0]> = [];
    const owner = createNotificationOwner({
      scheduler: {
        enqueueOncePerCause: async () => ({ creation: "CREATED" }),
        replaceActive: async () => ({ creation: "CREATED" }),
        cancelActive: async (input) => {
          cancellations.push(input);
          return 1;
        },
      },
      options: options(),
      schedulingContexts: {
        ...schedulingContexts,
        resolveConfirmationReminder: async () => {
          schedulingLoads += 1;
          return schedulingLoads === 1
            ? anchors
            : { state: "SKIPPED", reason: "CONFIRMATION_POLICY_UNAVAILABLE" };
        },
      },
      contexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date("2026-07-23T03:00:00.000Z"),
    });

    assert.deepEqual(await owner.request(request("CONFIRM_START")), { creation: "CANCELED" });
    assert.equal(cancellations.length, 1);
    assert.match(cancellations[0]?.activeKeyPrefix ?? "", /:42:$/);
    assert.doesNotMatch(cancellations[0]?.activeKeyPrefix ?? "", /CONFIRM_START/);
  });

  it("skips confirmation dispatch without a claimed Job runAt before option or channel I/O", async () => {
    let optionLoads = 0;
    let channelCalls = 0;
    const owner = createNotificationOwner({
      scheduler: {
        enqueueOncePerCause: async () => ({ creation: "CREATED" }),
        replaceActive: async () => ({ creation: "CREATED" }),
        cancelActive: async () => 0,
      },
      options: options(async () => {
        optionLoads += 1;
        return { preferred: true, credit: { kind: "LIMITED", remaining: 1 } };
      }),
      schedulingContexts,
      contexts,
      channel: {
        send: async () => {
          channelCalls += 1;
          return { outcome: "ACCEPTED", providerReference: null };
        },
      },
    });
    const task: NotificationTask = {
      schemaVersion: 1,
      template: "pr.confirmation-reminder",
      recipientUserId,
      channel: "WECHAT_SUBSCRIPTION",
      payload: request("CONFIRM_START").payload,
      aggregate: { type: "partner_request", id: "42" },
      causationId: "confirm:no-run-at",
    };
    assert.deepEqual(await owner.dispatch(task), {
      disposition: "SKIPPED",
      reason: "MISSING_JOB_RUN_AT",
    });
    assert.equal(optionLoads, 0);
    assert.equal(channelCalls, 0);
  });

  it("cancels only the selected confirmation trigger", async () => {
    const cancellations: Array<Parameters<NotificationTaskSchedulerPort["cancelActive"]>[0]> = [];
    const owner = createNotificationOwner({
      scheduler: {
        enqueueOncePerCause: async () => ({ creation: "CREATED" }),
        replaceActive: async () => ({ creation: "CREATED" }),
        cancelActive: async (input) => {
          cancellations.push(input);
          return 1;
        },
      },
      options: options(),
      schedulingContexts,
      contexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
    });
    await owner.cancel({
      template: "pr.confirmation-reminder",
      recipientUserId,
      scope: {
        kind: "TRIGGER",
        aggregate: { type: "partner_request", id: "42" },
        reminder: "CONFIRM_END_MINUS_30M",
      },
    });
    assert.match(cancellations[0]?.activeKeyPrefix ?? "", /:42:CONFIRM_END_MINUS_30M:$/);
    assert.doesNotMatch(cancellations[0]?.activeKeyPrefix ?? "", /CONFIRM_START/);
  });

  it("clears confirmation recipient work on 43101", async () => {
    let cleared = 0;
    const owner = createNotificationOwner({
      scheduler: {
        enqueueOncePerCause: async () => ({ creation: "CREATED" }),
        replaceActive: async () => ({ creation: "CREATED" }),
        cancelActive: async () => 1,
      },
      options: {
        ...options(),
        clearRecipientPermission: async () => {
          cleared += 1;
        },
      },
      schedulingContexts,
      contexts,
      channel: {
        send: async (): Promise<NotificationChannelSendResult> => ({
          outcome: "RECIPIENT_PERMISSION_REVOKED",
          errorCode: "43101",
          errorMessage: "revoked",
        }),
      },
      now: () => new Date("2026-07-23T04:00:00.000Z"),
    });
    const task: NotificationTask = {
      schemaVersion: 1,
      template: "pr.confirmation-reminder",
      recipientUserId,
      channel: "WECHAT_SUBSCRIPTION",
      payload: request("CONFIRM_START").payload,
      aggregate: { type: "partner_request", id: "42" },
      causationId: "confirm:permission",
    };
    assert.equal(
      (await owner.dispatch(task, { runAt: new Date("2026-07-23T04:00:00.000Z") })).reason,
      "RECIPIENT_PERMISSION_REVOKED",
    );
    assert.equal(cleared, 1);
  });

  it("invalidates remaining confirmation work after final credit", async () => {
    const cancellations: Array<Parameters<NotificationTaskSchedulerPort["cancelActive"]>[0]> = [];
    const owner = createNotificationOwner({
      scheduler: {
        enqueueOncePerCause: async () => ({ creation: "CREATED" }),
        replaceActive: async () => ({ creation: "CREATED" }),
        cancelActive: async (input) => {
          cancellations.push(input);
          return 1;
        },
      },
      options: {
        ...options(),
        consumeLimitedCredit: async () => ({ consumed: true, remaining: 0 }),
      },
      schedulingContexts,
      contexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: "ok" }) },
      now: () => new Date("2026-07-23T04:00:00.000Z"),
    });
    const task: NotificationTask = {
      schemaVersion: 1,
      template: "pr.confirmation-reminder",
      recipientUserId,
      channel: "WECHAT_SUBSCRIPTION",
      payload: request("CONFIRM_START").payload,
      aggregate: { type: "partner_request", id: "42" },
      causationId: "confirm:credit",
    };
    await owner.dispatch(task, { runAt: new Date("2026-07-23T04:00:00.000Z") });
    assert.equal(cancellations.length, 1);
    assert.match(
      cancellations[0]?.activeKeyPrefix ?? "",
      /notification-active:pr.confirmation-reminder:WECHAT_SUBSCRIPTION:.*:$/,
    );
  });
});
