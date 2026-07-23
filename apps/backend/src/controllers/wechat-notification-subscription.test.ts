import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://unit:unit@localhost:5432/unit";

const { applyPRMessageNotificationSubscriptionUpdate } = await import("./wechat.controller");

const RECIPIENT_USER_ID = "00000000-0000-4000-8000-000000000001";
type ControllerDependencies = NonNullable<
  Parameters<typeof applyPRMessageNotificationSubscriptionUpdate>[2]
>;

describe("PR-message subscription controller conversion", () => {
  it("delegates ADD_ONE to Notification", async () => {
    const updateSubscription = vi.fn<ControllerDependencies["updateSubscription"]>(async () => ({
      previous: { preferred: false, remainingCredit: 0 },
      current: { preferred: true, remainingCredit: 1 },
      invalidated: { released: 0, canceled: 0 },
    }));
    const result = await applyPRMessageNotificationSubscriptionUpdate(
      RECIPIENT_USER_ID,
      "ADD_ONE",
      {
        updateSubscription,
      },
    );

    assert.deepEqual(updateSubscription.mock.calls, [
      [{ recipientUserId: RECIPIENT_USER_ID, action: "ADD_ONE" }],
    ]);
    assert.deepEqual(result, {
      update: {
        previous: { preferred: false, remainingCredit: 0 },
        current: { preferred: true, remainingCredit: 1 },
        invalidated: { released: 0, canceled: 0 },
      },
      deletedJobs: 0,
    });
  });

  it("reports CLEAR's canonical generic-window invalidation", async () => {
    const updateSubscription = vi.fn<ControllerDependencies["updateSubscription"]>(async () => ({
      previous: { preferred: true, remainingCredit: 2 },
      current: { preferred: false, remainingCredit: 0 },
      invalidated: { released: 2, canceled: 1 },
    }));
    const result = await applyPRMessageNotificationSubscriptionUpdate(RECIPIENT_USER_ID, "CLEAR", {
      updateSubscription,
    });

    assert.deepEqual(updateSubscription.mock.calls, [
      [{ recipientUserId: RECIPIENT_USER_ID, action: "CLEAR" }],
    ]);
    assert.equal(result.deletedJobs, 1);
    assert.deepEqual(result.update.current, { preferred: false, remainingCredit: 0 });
  });
});
