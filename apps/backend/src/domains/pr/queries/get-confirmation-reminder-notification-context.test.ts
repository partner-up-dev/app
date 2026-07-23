import { describe, expect, it, vi } from "vitest";
import type { PartnerId } from "../../../entities/partner";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";

const { findPrById, findSlot } = vi.hoisted(() => ({
  findPrById: vi.fn<(id: PRId) => Promise<unknown>>(),
  findSlot: vi.fn<(prId: PRId, slotId: PartnerId) => Promise<unknown>>(),
}));

vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    findById = findPrById;
  },
}));
vi.mock("../../../repositories/PartnerRepository", () => ({
  PartnerRepository: class {
    findActiveParticipantSummaryByPrIdAndPartnerId = findSlot;
  },
}));

import {
  getConfirmationReminderNotificationContext,
  getConfirmationReminderSchedulingContext,
} from "./get-confirmation-reminder-notification-context";

const prId = 7 as PRId;
const slotId = 11 as PartnerId;
const recipientUserId = "00000000-0000-4000-8000-000000000001" as UserId;

const request = (overrides: Record<string, unknown> = {}) => ({
  id: prId,
  title: "周末羽毛球",
  type: "羽毛球",
  time: ["2030-01-01T10:00:00+08:00", "2030-01-01T12:00:00+08:00"],
  confirmationEnabled: true,
  confirmationStartOffsetMinutes: 120,
  confirmationEndOffsetMinutes: 30,
  joinLockOffsetMinutes: 30,
  ...overrides,
});

describe("confirmation reminder notification context", () => {
  it("projects policy anchors without mutating PR state", async () => {
    findPrById.mockResolvedValue(request());
    findSlot.mockResolvedValue({ partnerId: slotId, userId: recipientUserId, status: "JOINED" });

    await expect(
      getConfirmationReminderSchedulingContext({ prId, slotId, recipientUserId }),
    ).resolves.toEqual({
      state: "READY",
      confirmationStartAt: "2030-01-01T00:00:00.000Z",
      confirmationEndAt: "2030-01-01T01:30:00.000Z",
    });
    expect(findPrById).toHaveBeenCalledWith(prId);
    expect(findSlot).toHaveBeenCalledWith(prId, slotId);
  });

  it("requires the exact active slot recipient and policy", async () => {
    findPrById.mockResolvedValue(request({ confirmationEnabled: false }));
    findSlot.mockResolvedValue({ partnerId: slotId, userId: recipientUserId, status: "JOINED" });
    await expect(
      getConfirmationReminderSchedulingContext({
        prId,
        slotId,
        recipientUserId,
      }),
    ).resolves.toEqual({ state: "SKIPPED", reason: "CONFIRMATION_POLICY_UNAVAILABLE" });

    findPrById.mockResolvedValue(request());
    findSlot.mockResolvedValue({
      partnerId: slotId,
      userId: "00000000-0000-4000-8000-000000000002",
    });
    await expect(
      getConfirmationReminderNotificationContext({
        prId,
        slotId,
        recipientUserId,
      }),
    ).resolves.toEqual({ state: "SKIPPED", reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT" });
  });

  it.each([
    request({ time: [null, null] }),
    request({ time: ["2020-01-01T10:00:00+08:00", "2020-01-01T12:00:00+08:00"] }),
  ])(
    "skips scheduling and dispatch when activity start is unavailable or past",
    async (current) => {
      findPrById.mockResolvedValue(current);
      findSlot.mockResolvedValue({ partnerId: slotId, userId: recipientUserId, status: "JOINED" });

      const expected = { state: "SKIPPED", reason: "ACTIVITY_START_UNAVAILABLE" } as const;
      await expect(
        getConfirmationReminderSchedulingContext({ prId, slotId, recipientUserId }),
      ).resolves.toEqual(expected);
      await expect(
        getConfirmationReminderNotificationContext({ prId, slotId, recipientUserId }),
      ).resolves.toEqual(expected);
    },
  );
});
