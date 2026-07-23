import { describe, expect, it, vi } from "vitest";
import type { PartnerId } from "../../../entities/partner";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { ConfirmationReminderReconcilerDependencies } from "./confirmation-reminder-reconciler.service";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

vi.mock("../../../repositories/PartnerRepository", () => ({
  PartnerRepository: class {
    async findActiveByUserId(): Promise<never[]> {
      return [];
    }
  },
}));
vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    async findById(): Promise<null> {
      return null;
    }
  },
}));

const { reconcileConfirmationRemindersForParticipant, reconcileConfirmationRemindersForRecipient } =
  await import("./confirmation-reminder-reconciler.service");

const prId = 42 as PRId;
const slotId = 101 as PartnerId;
const recipientUserId = "00000000-0000-4000-8000-000000000001" as UserId;

const ready = (
  confirmationStartAt: string,
  confirmationEndAt: string | null = "2030-01-01T01:00:00.000Z",
) => ({
  state: "READY" as const,
  confirmationStartAt,
  confirmationEndAt,
});
const createDependencies = (
  context: Awaited<ReturnType<ConfirmationReminderReconcilerDependencies["loadCurrentContext"]>>,
): ConfirmationReminderReconcilerDependencies => ({
  listCurrentParticipations: vi.fn<
    ConfirmationReminderReconcilerDependencies["listCurrentParticipations"]
  >(async () => [{ prId, slotId }]),
  loadCurrentContext: vi.fn<ConfirmationReminderReconcilerDependencies["loadCurrentContext"]>(
    async () => context,
  ),
  request: vi.fn<ConfirmationReminderReconcilerDependencies["request"]>(async () => ({
    creation: "CREATED",
  })),
  cancel: vi.fn<ConfirmationReminderReconcilerDependencies["cancel"]>(async () => ({
    canceled: 1,
  })),
});

describe("confirmation reminder reconciler", () => {
  it("requests both triggers with independent payloads", async () => {
    const dependencies = createDependencies(ready("2030-01-01T00:00:00.000Z"));

    await expect(
      reconcileConfirmationRemindersForParticipant({ prId, slotId, recipientUserId }, dependencies),
    ).resolves.toEqual({ requested: ["CONFIRM_START", "CONFIRM_END_MINUS_30M"], canceled: 0 });
    expect(dependencies.request).toHaveBeenCalledTimes(2);
    expect(dependencies.request).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        payload: { prId, slotId, reminder: "CONFIRM_START" },
      }),
    );
    expect(dependencies.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        payload: { prId, slotId, reminder: "CONFIRM_END_MINUS_30M" },
      }),
    );
  });

  it("cancels only the absent trigger and preserves the sibling", async () => {
    const dependencies = createDependencies(ready("2030-01-01T00:00:00.000Z", null));

    await expect(
      reconcileConfirmationRemindersForParticipant({ prId, slotId, recipientUserId }, dependencies),
    ).resolves.toEqual({ requested: ["CONFIRM_START"], canceled: 1 });
    expect(dependencies.cancel).toHaveBeenCalledWith({
      template: "pr.confirmation-reminder",
      recipientUserId,
      scope: {
        kind: "TRIGGER",
        aggregate: { type: "partner_request", id: String(prId) },
        reminder: "CONFIRM_END_MINUS_30M",
      },
    });
  });

  it("cancels aggregate work for ineligible policy", async () => {
    const dependencies = createDependencies({
      state: "SKIPPED",
      reason: "CONFIRMATION_POLICY_UNAVAILABLE",
    });

    await expect(
      reconcileConfirmationRemindersForParticipant({ prId, slotId, recipientUserId }, dependencies),
    ).resolves.toEqual({ requested: [], canceled: 1 });
    expect(dependencies.cancel).toHaveBeenCalledWith({
      template: "pr.confirmation-reminder",
      recipientUserId,
      scope: { kind: "AGGREGATE", aggregate: { type: "partner_request", id: String(prId) } },
    });
  });

  it("invalidates recipient before deduped slot rebuild", async () => {
    const calls: string[] = [];
    const dependencies = createDependencies(ready("2030-01-01T00:00:00.000Z"));
    dependencies.cancel = vi.fn<ConfirmationReminderReconcilerDependencies["cancel"]>(async () => {
      calls.push("cancel");
      return { canceled: 2 };
    });
    dependencies.listCurrentParticipations = vi.fn<
      ConfirmationReminderReconcilerDependencies["listCurrentParticipations"]
    >(async () => {
      calls.push("list");
      return [
        { prId, slotId },
        { prId, slotId },
      ];
    });
    dependencies.request = vi.fn<ConfirmationReminderReconcilerDependencies["request"]>(
      async () => {
        calls.push("request");
        return { creation: "CREATED" as const };
      },
    );

    await expect(
      reconcileConfirmationRemindersForRecipient({ recipientUserId }, dependencies),
    ).resolves.toEqual({
      canceled: 2,
      reconciled: [{ prId, slotId }],
    });
    expect(calls).toEqual(["cancel", "list", "request", "request"]);
  });
});
