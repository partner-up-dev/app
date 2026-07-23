import { describe, expect, it, vi } from "vitest";
import type { PartnerId, WaitlistCycleId } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { AlternativeWaitlistReminderSlot } from "../../../repositories/PartnerRepository";
import type { WaitlistAlternativeReconcilerDependencies } from "./waitlist-alternative-reconciler.service";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

vi.mock("../../../repositories/PartnerRepository", () => ({
  PartnerRepository: class {
    async listPendingAlternativeReminderSlotsByTypeAndLocation(): Promise<never[]> {
      return [];
    }

    async listPendingAlternativeReminderSlotsByUser(): Promise<never[]> {
      return [];
    }
  },
}));
vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    async findById(): Promise<null> {
      return null;
    }

    async findVisibleByType(): Promise<never[]> {
      return [];
    }
  },
}));
vi.mock("../queries/get-waitlist-alternative-available-notification-context", () => ({
  getWaitlistAlternativeAvailableNotificationContext: async () => ({
    state: "SKIPPED",
    reason: "SOURCE_WAITLIST_SLOT_NOT_PENDING",
  }),
}));

const {
  reconcileAlternativeWaitlistNotificationsForCandidate,
  reconcileAlternativeWaitlistNotificationsForSource,
  reconcileWaitlistAlternativeNotification,
} = await import("./waitlist-alternative-reconciler.service");

const recipientUserId = "00000000-0000-4000-8000-000000000001" as UserId;
const sourcePrId = 42 as PRId;
const candidatePrId = 99 as PRId;
const sourcePartnerId = 7 as PartnerId;
const sourceWaitlistCycleId = "00000000-0000-4000-8000-000000000007" as WaitlistCycleId;

const buildRequest = (id: PRId, overrides: Partial<PartnerRequest> = {}): PartnerRequest => {
  const now = new Date("2026-07-23T03:00:00.000Z");
  return {
    id,
    title: "周末徒步",
    type: "hiking",
    time: ["2030-01-01T12:00:00.000Z", "2030-01-01T14:00:00.000Z"],
    location: "白云山",
    route: null,
    status: "OPEN",
    readyCycleId: null,
    visibilityStatus: "VISIBLE",
    confirmationEnabled: true,
    confirmationStartOffsetMinutes: 120,
    confirmationEndOffsetMinutes: 30,
    joinLockOffsetMinutes: 30,
    minPartners: 1,
    maxPartners: 2,
    budget: null,
    createdAt: now,
    preferences: [],
    notes: null,
    meetingPoint: null,
    allowEditAfterReady: null,
    joinGateConfig: [],
    orders: [],
    feedbackQuestionnaireInstanceId: null,
    createdBy: null,
    xiaohongshuPoster: null,
    wechatThumbnail: null,
    ...overrides,
  } satisfies PartnerRequest;
};

const sourceSlot = (
  overrides: Partial<AlternativeWaitlistReminderSlot> = {},
): AlternativeWaitlistReminderSlot => ({
  partnerId: sourcePartnerId,
  prId: sourcePrId,
  userId: recipientUserId,
  waitlistCycleId: sourceWaitlistCycleId,
  waitlistedAt: new Date("2026-07-23T03:00:00.000Z"),
  ...overrides,
});

const createDependencies = (
  context: Awaited<ReturnType<WaitlistAlternativeReconcilerDependencies["loadCurrentContext"]>>,
): WaitlistAlternativeReconcilerDependencies => ({
  listSourceSlotsByTypeAndLocation: vi.fn<
    WaitlistAlternativeReconcilerDependencies["listSourceSlotsByTypeAndLocation"]
  >(async () => []),
  listSourceSlotsByUser: vi.fn<WaitlistAlternativeReconcilerDependencies["listSourceSlotsByUser"]>(
    async () => [],
  ),
  findRequestById: vi.fn<WaitlistAlternativeReconcilerDependencies["findRequestById"]>(
    async () => null,
  ),
  findVisibleRequestsByType: vi.fn<
    WaitlistAlternativeReconcilerDependencies["findVisibleRequestsByType"]
  >(async () => []),
  loadCurrentContext: vi.fn<WaitlistAlternativeReconcilerDependencies["loadCurrentContext"]>(
    async () => context,
  ),
  request: vi.fn<WaitlistAlternativeReconcilerDependencies["request"]>(async () => ({
    creation: "CREATED",
  })),
});

describe("waitlist-alternative reconciler", () => {
  it("requests one strict generic task with source-cycle causation", async () => {
    const dependencies = createDependencies({ state: "READY", title: "周末徒步" });
    const pair = {
      sourcePrId,
      sourcePartnerId,
      sourceWaitlistCycleId,
      candidatePrId,
      recipientUserId,
    };

    await expect(reconcileWaitlistAlternativeNotification(pair, dependencies)).resolves.toEqual({
      outcome: "REQUESTED",
      pair,
      creation: "CREATED",
    });
    expect(dependencies.request).toHaveBeenCalledWith({
      template: "pr.waitlist-alternative-available",
      recipientUserId,
      channel: "WECHAT_SUBSCRIPTION",
      payload: {
        sourcePrId,
        sourcePartnerId,
        sourceWaitlistCycleId,
        candidatePrId,
      },
      metadata: {
        aggregate: { type: "partner_request", id: "42" },
        causationId:
          "partner_request:42:waitlist-alternative:7:00000000-0000-4000-8000-000000000007:99",
      },
    });
  });

  it("never requests a stale current-state pair", async () => {
    const dependencies = createDependencies({
      state: "SKIPPED",
      reason: "SOURCE_WAITLIST_CYCLE_SUPERSEDED",
    });
    const pair = {
      sourcePrId,
      sourcePartnerId,
      sourceWaitlistCycleId,
      candidatePrId,
      recipientUserId,
    };

    await expect(reconcileWaitlistAlternativeNotification(pair, dependencies)).resolves.toEqual({
      outcome: "SKIPPED",
      pair,
      reason: "SOURCE_WAITLIST_CYCLE_SUPERSEDED",
    });
    expect(dependencies.request).not.toHaveBeenCalled();
  });

  it("dedupes discovery rows locally and refuses a source slot without a cycle", async () => {
    const dependencies = createDependencies({ state: "READY", title: "周末徒步" });
    dependencies.listSourceSlotsByTypeAndLocation = vi.fn<
      WaitlistAlternativeReconcilerDependencies["listSourceSlotsByTypeAndLocation"]
    >(async () => [sourceSlot(), sourceSlot(), sourceSlot({ waitlistCycleId: null })]);

    const result = await reconcileAlternativeWaitlistNotificationsForCandidate(
      buildRequest(candidatePrId),
      dependencies,
    );

    expect(result).toHaveLength(1);
    expect(dependencies.request).toHaveBeenCalledTimes(1);
    expect(dependencies.listSourceSlotsByTypeAndLocation).toHaveBeenCalledWith({
      type: "hiking",
      location: "白云山",
      excludePrId: candidatePrId,
    });
  });

  it("filters candidate discovery by source identity before strict eligibility recheck", async () => {
    const dependencies = createDependencies({ state: "READY", title: "周末徒步" });
    dependencies.findVisibleRequestsByType = vi.fn<
      WaitlistAlternativeReconcilerDependencies["findVisibleRequestsByType"]
    >(async () => [
      buildRequest(sourcePrId),
      buildRequest(candidatePrId, { location: "其它地点" }),
      buildRequest(candidatePrId),
    ]);

    const result = await reconcileAlternativeWaitlistNotificationsForSource(
      {
        sourceRequest: buildRequest(sourcePrId),
        sourcePartnerId,
        sourceWaitlistCycleId,
        recipientUserId,
      },
      dependencies,
    );

    expect(result).toHaveLength(1);
    expect(dependencies.loadCurrentContext).toHaveBeenCalledWith({
      sourcePrId,
      sourcePartnerId,
      sourceWaitlistCycleId,
      candidatePrId,
      recipientUserId,
    });
  });
});
