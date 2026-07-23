import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { NotificationRequest } from "../contracts";
import type { NotificationTaskSchedulerPort } from "./ports";
import { createWaitlistPromotionNotificationPort } from "./waitlist-promotion-notification";

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

describe("waitlist-promotion Notification port", () => {
  it("applies the same private once-per-cause policy through a narrow scheduler", async () => {
    const scheduled: Array<Parameters<NotificationTaskSchedulerPort["enqueueOncePerCause"]>[0]> =
      [];
    const port = createWaitlistPromotionNotificationPort({
      scheduler: {
        enqueueOncePerCause: async (input) => {
          scheduled.push(input);
          return { creation: "COALESCED" };
        },
      },
      now: () => new Date("2026-07-22T10:00:00.000Z"),
    });

    assert.deepEqual(await port.request(request), { creation: "COALESCED" });
    assert.deepEqual(scheduled, [
      {
        task: {
          schemaVersion: 1,
          template: "pr.waitlist-promoted",
          recipientUserId: "00000000-0000-4000-8000-000000000001",
          channel: "WECHAT_SUBSCRIPTION",
          payload: {
            prId: 42,
            partnerId: 7,
            waitlistCycleId: "00000000-0000-4000-8000-000000000007",
          },
          aggregate: { type: "partner_request", id: "42" },
          causationId:
            "partner_request:42:waitlist-promotion:7:00000000-0000-4000-8000-000000000007",
        },
        creationKey:
          "notification:pr.waitlist-promoted:WECHAT_SUBSCRIPTION:00000000-0000-4000-8000-000000000001:42:7:00000000-0000-4000-8000-000000000007",
        runAt: new Date("2026-07-22T10:00:00.000Z"),
        timing: { resolutionMs: 1_000, earlyToleranceUnits: 0, lateToleranceUnits: -1 },
      },
    ]);
  });

  it("propagates a transaction-bound scheduler failure", async () => {
    const port = createWaitlistPromotionNotificationPort({
      scheduler: {
        enqueueOncePerCause: async () => {
          throw new Error("TRANSACTION_JOB_WRITE_FAILED");
        },
      },
    });

    await assert.rejects(port.request(request), /TRANSACTION_JOB_WRITE_FAILED/);
  });
});
