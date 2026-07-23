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

const recipientUserId = "00000000-0000-4000-8000-000000000001";
const updateId = "00000000-0000-4000-8000-000000000042";
const updatedAtIso = "2026-07-23T02:30:00.000Z";

const request: NotificationRequest<"pr.meeting-point-updated"> = {
  template: "pr.meeting-point-updated",
  recipientUserId,
  channel: "WECHAT_SUBSCRIPTION",
  payload: {
    prId: 42,
    meetingPointUpdateId: updateId,
    meetingPointDescription: "白云山南门集合",
    updatedAtIso,
  },
  metadata: {
    aggregate: { type: "partner_request", id: "42" },
    causationId: "partner_request:42:meeting-point:00000000-0000-4000-8000-000000000042",
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

const contexts: NotificationDispatchContextPort = {
  resolveActivityStartReminder: async () => ({
    state: "SKIPPED",
    reason: "PR_MISSING_OR_UNSUPPORTED",
  }),
  resolveWaitlistPromoted: async () => ({ state: "SKIPPED", reason: "PR_MISSING" }),
  resolveMeetingPointUpdated: async () => ({
    state: "READY",
    recipientChannelAddress: "meeting-point-open-id",
    page: "/pr/42",
  }),
};

const options = (
  input: {
    onConsume?: () => void;
    onClear?: () => void;
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
  clearRecipientPermission: async () => {
    input.onClear?.();
  },
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

describe("Meeting-point-updated Notification owner", () => {
  it("uses immutable source event identity rather than a timestamp-only key", async () => {
    const enqueued: Array<Parameters<NotificationTaskSchedulerPort["enqueueOncePerCause"]>[0]> = [];
    const owner = createNotificationOwner({
      scheduler: scheduler(enqueued),
      options: options(),
      schedulingContexts,
      contexts,
      channel: { send: async () => ({ outcome: "ACCEPTED", providerReference: null }) },
      now: () => new Date(updatedAtIso),
    });
    const secondUpdateId = "00000000-0000-4000-8000-000000000043";

    assert.deepEqual(await owner.request(request), { creation: "CREATED" });
    assert.deepEqual(
      await owner.request({
        ...request,
        payload: {
          ...request.payload,
          meetingPointUpdateId: secondUpdateId,
          meetingPointDescription: "白云山北门集合",
        },
        metadata: {
          ...request.metadata,
          causationId: "partner_request:42:meeting-point:00000000-0000-4000-8000-000000000043",
        },
      }),
      { creation: "CREATED" },
    );

    assert.equal(enqueued.length, 2);
    assert.deepEqual(enqueued[0], {
      task,
      creationKey:
        "notification:pr.meeting-point-updated:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:00000000-0000-4000-8000-000000000042",
      runAt: new Date(updatedAtIso),
      timing: { resolutionMs: 1_000, earlyToleranceUnits: 0, lateToleranceUnits: -1 },
    });
    assert.equal(
      enqueued[1]?.creationKey,
      "notification:pr.meeting-point-updated:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:00000000-0000-4000-8000-000000000043",
    );
  });

  it("renders immutable event facts and consumes limited credit after accepted send", async () => {
    let consumed = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([]),
      options: options({ onConsume: () => (consumed += 1) }),
      schedulingContexts,
      contexts,
      channel: {
        send: async (message) => {
          assert.deepEqual(message, {
            channel: "WECHAT_SUBSCRIPTION",
            template: "pr.meeting-point-updated",
            recipientChannelAddress: "meeting-point-open-id",
            content: {
              updateType: "碰头地点",
              operatorName: "系统",
              updatedAt: "2026-07-23 10:30",
              meetingPointDescription: "白云山南门集合",
              page: "/pr/42",
            },
          });
          return { outcome: "ACCEPTED", providerReference: "meeting-point-provider-id" };
        },
      },
    });

    assert.deepEqual(await owner.dispatch(task), {
      disposition: "SUCCEEDED",
      reason: "CHANNEL_ACCEPTED",
      providerReference: "meeting-point-provider-id",
    });
    assert.equal(consumed, 1);
  });

  it("skips a participant who left without sending or consuming credit", async () => {
    let channelCalls = 0;
    let consumed = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([]),
      options: options({ onConsume: () => (consumed += 1) }),
      schedulingContexts,
      contexts: {
        ...contexts,
        resolveMeetingPointUpdated: async () => ({
          state: "SKIPPED",
          reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
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
      reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
    });
    assert.equal(channelCalls, 0);
    assert.equal(consumed, 0);
  });

  it("clears recipient permission when WeChat proves subscription revocation", async () => {
    let cleared = 0;
    const owner = createNotificationOwner({
      scheduler: scheduler([]),
      options: options({ onClear: () => (cleared += 1) }),
      schedulingContexts,
      contexts,
      channel: {
        send: async () => ({
          outcome: "RECIPIENT_PERMISSION_REVOKED",
          errorCode: "43101",
          errorMessage: "subscription revoked",
        }),
      },
    });

    assert.deepEqual(await owner.dispatch(task), {
      disposition: "PERMANENT_FAILURE",
      reason: "RECIPIENT_PERMISSION_REVOKED",
    });
    assert.equal(cleared, 1);
  });
});
