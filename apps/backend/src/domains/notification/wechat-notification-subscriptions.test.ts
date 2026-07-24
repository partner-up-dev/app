import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserId } from "../../entities/user";
import type { WeChatNotificationKind } from "../../entities/user-notification-opt";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

type SubscriptionSnapshot = {
  enabled: boolean;
  optInAt: Date | null;
  remainingCount: number;
};

const mocks = vi.hoisted(() => ({
  addOne: vi.fn<(userId: UserId, kind: WeChatNotificationKind) => Promise<unknown>>(),
  cancel: vi.fn<(input: unknown) => Promise<{ canceled: number }>>(),
  clear: vi.fn<(userId: UserId, kind: WeChatNotificationKind) => Promise<unknown>>(),
  findByUserId: vi.fn<(userId: UserId) => Promise<unknown>>(),
  getSnapshot: vi.fn<(option: unknown, kind: WeChatNotificationKind) => SubscriptionSnapshot>(),
  reconcileActivity: vi.fn<(input: { recipientUserId: UserId }) => Promise<{ canceled: number }>>(),
  reconcileConfirmation:
    vi.fn<(input: { recipientUserId: UserId }) => Promise<{ canceled: number }>>(),
  reconcileWaitlistAlternatives: vi.fn<(userId: UserId) => Promise<unknown[]>>(),
  setRemainingCount:
    vi.fn<(userId: UserId, kind: WeChatNotificationKind, count: number) => Promise<unknown>>(),
  updatePRMessage: vi.fn<
    (input: { recipientUserId: string; action: "ADD_ONE" | "CLEAR" }) => Promise<{
      previous: { preferred: boolean; remainingCredit: number };
      current: { preferred: boolean; remainingCredit: number };
      invalidated: { released: number; canceled: number };
    }>
  >(),
}));

vi.mock("../../repositories/UserNotificationOptRepository", () => ({
  UserNotificationOptRepository: class {
    findByUserId = mocks.findByUserId;
    getSubscriptionSnapshot = mocks.getSnapshot;
    addOneWechatNotificationCredit = mocks.addOne;
    clearWechatNotificationCredits = mocks.clear;
    setWechatNotificationRemainingCount = mocks.setRemainingCount;
  },
}));
vi.mock("./owner/runtime", () => ({
  getNotificationOwner: () => ({ cancel: mocks.cancel }),
}));
vi.mock("./pr-message-subscription", () => ({
  updatePRMessageNotificationSubscription: mocks.updatePRMessage,
}));

const { createWeChatNotificationSubscriptionCommands, getWeChatNotificationSubscriptions } =
  await import("./wechat-notification-subscriptions");
const subscriptionCommands = createWeChatNotificationSubscriptionCommands({
  reconciliationPort: {
    reconcileActivityStartRemindersForRecipient: mocks.reconcileActivity,
    reconcileConfirmationRemindersForRecipient: mocks.reconcileConfirmation,
    reconcileAlternativeWaitlistNotificationsForUserSources: mocks.reconcileWaitlistAlternatives,
  },
});

const userId = "00000000-0000-4000-8000-000000000001" as UserId;
const previousOption = { state: "previous" };
const updatedOption = { state: "updated" };
const disabledSnapshot = {
  enabled: false,
  optInAt: null,
  remainingCount: 0,
};
const enabledSnapshot = (remainingCount = 1) => ({
  enabled: true,
  optInAt: new Date("2026-07-23T04:05:06.000Z"),
  remainingCount,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findByUserId.mockResolvedValue(previousOption);
  mocks.addOne.mockResolvedValue(updatedOption);
  mocks.clear.mockResolvedValue(updatedOption);
  mocks.setRemainingCount.mockResolvedValue(updatedOption);
  mocks.cancel.mockResolvedValue({ canceled: 0 });
  mocks.reconcileActivity.mockResolvedValue({ canceled: 0 });
  mocks.reconcileConfirmation.mockResolvedValue({ canceled: 0 });
  mocks.reconcileWaitlistAlternatives.mockResolvedValue([]);
});

describe("WeChat notification subscription owner surface", () => {
  it("projects every kind with ISO timestamps and explicit nulls", async () => {
    mocks.getSnapshot.mockImplementation((_option: unknown, kind: WeChatNotificationKind) =>
      kind === "REMINDER_CONFIRMATION" ? enabledSnapshot(2) : disabledSnapshot,
    );

    const subscriptions = await getWeChatNotificationSubscriptions(userId);

    expect(mocks.findByUserId).toHaveBeenCalledOnce();
    expect(subscriptions.REMINDER_CONFIRMATION).toEqual({
      enabled: true,
      optInAt: "2026-07-23T04:05:06.000Z",
      remainingCount: 2,
    });
    expect(subscriptions.PR_MESSAGE).toEqual(disabledSnapshot);
    expect(Object.keys(subscriptions)).toHaveLength(8);
  });

  it.each([
    ["ADD_ONE", true, 2, 3],
    ["CLEAR", false, 0, 4],
  ] as const)(
    "delegates PR_MESSAGE %s to its serialized transaction and returns deleted Jobs",
    async (action, preferred, remainingCredit, canceled) => {
      mocks.updatePRMessage.mockResolvedValue({
        previous: { preferred: !preferred, remainingCredit: preferred ? 0 : 2 },
        current: { preferred, remainingCredit },
        invalidated: { released: 1, canceled },
      });
      mocks.getSnapshot.mockReturnValue(
        preferred ? enabledSnapshot(remainingCredit) : disabledSnapshot,
      );

      await expect(
        subscriptionCommands.update({
          userId,
          kind: "PR_MESSAGE",
          action,
        }),
      ).resolves.toEqual({
        kind: "PR_MESSAGE",
        action,
        enabled: preferred,
        optInAt: preferred ? "2026-07-23T04:05:06.000Z" : null,
        remainingCount: remainingCredit,
        deletedJobs: canceled,
      });
      expect(mocks.updatePRMessage).toHaveBeenCalledWith({
        recipientUserId: userId,
        action,
      });
      expect(mocks.addOne).not.toHaveBeenCalled();
      expect(mocks.clear).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["REMINDER_CONFIRMATION", mocks.reconcileConfirmation],
    ["ACTIVITY_START_REMINDER", mocks.reconcileActivity],
  ] as const)("reconciles positive %s credit after mutation", async (kind, reconcile) => {
    mocks.getSnapshot.mockReturnValueOnce(disabledSnapshot).mockReturnValueOnce(enabledSnapshot());
    reconcile.mockResolvedValueOnce({ canceled: 2 });

    const result = await subscriptionCommands.update({
      userId,
      kind,
      action: "ADD_ONE",
    });

    expect(reconcile).toHaveBeenCalledWith({ recipientUserId: userId });
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(result.deletedJobs).toBe(2);
  });

  it.each([
    ["REMINDER_CONFIRMATION", "pr.confirmation-reminder"],
    ["ACTIVITY_START_REMINDER", "pr.activity-start-reminder"],
  ] as const)("cancels %s work after clear", async (kind, template) => {
    mocks.getSnapshot.mockReturnValueOnce(enabledSnapshot()).mockReturnValueOnce(disabledSnapshot);
    mocks.cancel.mockResolvedValueOnce({ canceled: 3 });

    const result = await subscriptionCommands.update({
      userId,
      kind,
      action: "CLEAR",
    });

    expect(mocks.cancel).toHaveBeenCalledWith({
      template,
      recipientUserId: userId,
      scope: { kind: "RECIPIENT" },
    });
    expect(result.deletedJobs).toBe(3);
  });

  it("rescans waitlist alternatives only on a zero-to-positive transition", async () => {
    mocks.getSnapshot.mockReturnValueOnce(disabledSnapshot).mockReturnValueOnce(enabledSnapshot());

    await subscriptionCommands.update({
      userId,
      kind: "WAITLIST_ALTERNATIVE_AVAILABLE",
      action: "ADD_ONE",
    });

    expect(mocks.reconcileWaitlistAlternatives).toHaveBeenCalledOnce();
    expect(mocks.reconcileWaitlistAlternatives).toHaveBeenCalledWith(userId);

    mocks.getSnapshot
      .mockReturnValueOnce(enabledSnapshot())
      .mockReturnValueOnce(enabledSnapshot(2));
    await subscriptionCommands.update({
      userId,
      kind: "WAITLIST_ALTERNATIVE_AVAILABLE",
      action: "ADD_ONE",
    });
    expect(mocks.reconcileWaitlistAlternatives).toHaveBeenCalledOnce();
  });

  it.each([
    [true, 1],
    [false, 0],
  ] as const)("keeps legacy confirmation enabled=%s at exact credit %i", async (enabled, count) => {
    mocks.getSnapshot
      .mockReturnValueOnce(enabled ? disabledSnapshot : enabledSnapshot(5))
      .mockReturnValueOnce(enabled ? enabledSnapshot(1) : disabledSnapshot);

    await subscriptionCommands.setConfirmation({ userId, enabled });

    expect(mocks.setRemainingCount).toHaveBeenCalledWith(userId, "REMINDER_CONFIRMATION", count);
  });
});
