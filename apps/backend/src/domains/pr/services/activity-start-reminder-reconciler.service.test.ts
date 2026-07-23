import { describe, expect, it, vi } from "vitest";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { ActivityStartReminderReconcilerDependencies } from "./activity-start-reminder-reconciler.service";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

vi.mock("../../../repositories/PartnerRepository", () => ({
  PartnerRepository: class {
    async findActiveByUserId(): Promise<never[]> {
      return [];
    }
  },
}));
vi.mock("../queries/get-activity-start-reminder-notification-context", () => ({
  getActivityStartReminderSchedulingContext: async () => ({
    state: "SKIPPED",
    reason: "PR_MISSING_OR_UNSUPPORTED",
  }),
}));

const {
  reconcileActivityStartReminderForParticipant,
  reconcileActivityStartRemindersForRecipient,
} = await import("./activity-start-reminder-reconciler.service");

const prId = 42 as PRId;
const recipientUserId = "00000000-0000-4000-8000-000000000001" as UserId;

const createDependencies = (
  current: Awaited<ReturnType<ActivityStartReminderReconcilerDependencies["loadCurrentContext"]>>,
): ActivityStartReminderReconcilerDependencies => ({
  listCurrentParticipations: vi.fn<
    ActivityStartReminderReconcilerDependencies["listCurrentParticipations"]
  >(async () => []),
  loadCurrentContext: vi.fn<ActivityStartReminderReconcilerDependencies["loadCurrentContext"]>(
    async () => current,
  ),
  request: vi.fn<ActivityStartReminderReconcilerDependencies["request"]>(async () => ({
    creation: "CREATED",
  })),
  cancel: vi.fn<ActivityStartReminderReconcilerDependencies["cancel"]>(async () => ({
    canceled: 1,
  })),
});

describe("activity-start reminder reconciler", () => {
  it("requests the current semantic start with stable aggregate causation", async () => {
    const dependencies = createDependencies({
      state: "READY",
      activityStartAt: "2026-07-23T12:00:00+08:00",
    });

    const first = await reconcileActivityStartReminderForParticipant(
      { prId, recipientUserId },
      dependencies,
    );
    const second = await reconcileActivityStartReminderForParticipant(
      { prId, recipientUserId },
      dependencies,
    );

    expect(first).toEqual({ outcome: "REQUESTED", creation: "CREATED" });
    expect(second).toEqual(first);
    expect(dependencies.request).toHaveBeenCalledTimes(2);
    expect(dependencies.request).toHaveBeenNthCalledWith(1, {
      template: "pr.activity-start-reminder",
      recipientUserId,
      channel: "WECHAT_SUBSCRIPTION",
      payload: {
        prId,
        activityStartAt: "2026-07-23T04:00:00.000Z",
      },
      metadata: {
        aggregate: { type: "partner_request", id: "42" },
        causationId:
          "partner_request:42:activity-start-reminder:00000000-0000-4000-8000-000000000001:2026-07-23T04:00:00.000Z",
      },
    });
    expect(vi.mocked(dependencies.request).mock.calls[1]?.[0]).toEqual(
      vi.mocked(dependencies.request).mock.calls[0]?.[0],
    );
    expect(dependencies.cancel).not.toHaveBeenCalled();
  });

  it.each([
    "PR_MISSING_OR_UNSUPPORTED",
    "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
    "ACTIVITY_START_UNAVAILABLE",
  ] as const)("cancels aggregate work when current PR facts are skipped: %s", async (reason) => {
    const dependencies = createDependencies({ state: "SKIPPED", reason });

    await expect(
      reconcileActivityStartReminderForParticipant({ prId, recipientUserId }, dependencies),
    ).resolves.toEqual({ outcome: "CANCELED", canceled: 1 });
    expect(dependencies.request).not.toHaveBeenCalled();
    expect(dependencies.cancel).toHaveBeenCalledWith({
      template: "pr.activity-start-reminder",
      recipientUserId,
      scope: {
        kind: "AGGREGATE",
        aggregate: { type: "partner_request", id: "42" },
      },
    });
  });

  it("invalidates recipient work before rebuilding unique current participations", async () => {
    const invocations: string[] = [];
    const dependencies = createDependencies({
      state: "READY",
      activityStartAt: "2026-07-23T12:00:00+08:00",
    });
    dependencies.cancel = vi.fn<ActivityStartReminderReconcilerDependencies["cancel"]>(async () => {
      invocations.push("cancel");
      return { canceled: 3 };
    });
    dependencies.listCurrentParticipations = vi.fn<
      ActivityStartReminderReconcilerDependencies["listCurrentParticipations"]
    >(async () => {
      invocations.push("list");
      return [{ prId }, { prId }, { prId: 43 as PRId }];
    });
    dependencies.request = vi.fn<ActivityStartReminderReconcilerDependencies["request"]>(
      async (request) => {
        invocations.push(`request:${request.payload.prId}`);
        return { creation: "CREATED" };
      },
    );

    await expect(
      reconcileActivityStartRemindersForRecipient({ recipientUserId }, dependencies),
    ).resolves.toEqual({ canceled: 3, reconciledPrIds: [prId, 43] });
    expect(dependencies.cancel).toHaveBeenCalledWith({
      template: "pr.activity-start-reminder",
      recipientUserId,
      scope: { kind: "RECIPIENT" },
    });
    expect(dependencies.listCurrentParticipations).toHaveBeenCalledWith(recipientUserId);
    expect(dependencies.loadCurrentContext).toHaveBeenCalledTimes(2);
    expect(dependencies.request).toHaveBeenCalledTimes(2);
    expect(invocations).toEqual(["cancel", "list", "request:42", "request:43"]);
  });
});
