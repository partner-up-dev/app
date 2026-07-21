import { describe, expect, it, vi } from "vitest";
import type { OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import {
  getPRPlacementOrderingAdmission,
  type PlacementOrderingAdmissionDependencies,
} from "./placement-ordering-admission";

vi.mock("../../../repositories/PartnerRepository", () => ({
  PartnerRepository: class {},
}));
vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {},
}));
vi.mock("../../../repositories/TradeOrderRepository", () => ({
  TradeOrderRepository: class {},
}));

const prId = 41 as PRId;
const offerId = 73 as OfferId;
const creatorId = "11111111-1111-4111-8111-111111111111" as UserId;
const participantId = "22222222-2222-4222-8222-222222222222" as UserId;
const orderId = "33333333-3333-4333-8333-333333333333" as TradeOrderId;

const createDependencies = (input?: {
  active?: boolean;
  createdBy?: UserId | null;
  existingOrderId?: TradeOrderId | null;
  status?: string;
}): PlacementOrderingAdmissionDependencies => ({
  findActiveParticipant: vi.fn<
    PlacementOrderingAdmissionDependencies["findActiveParticipant"]
  >(async (_prId, userId) => (input?.active === false ? null : { userId })),
  findPartnerRequest: vi.fn<PlacementOrderingAdmissionDependencies["findPartnerRequest"]>(
    async () => ({
      createdBy: input?.createdBy === undefined ? creatorId : input.createdBy,
      orders: input?.existingOrderId ? [input.existingOrderId] : [],
      status: input?.status ?? "READY",
    }),
  ),
  listActiveOrders: vi.fn<PlacementOrderingAdmissionDependencies["listActiveOrders"]>(
    async () => (input?.existingOrderId ? [{ id: input.existingOrderId }] : []),
  ),
});

describe("PR Placement ordering admission", () => {
  it("returns an existing active order to an active non-creator before new-order checks", async () => {
    const result = await getPRPlacementOrderingAdmission(
      { actorUserId: participantId, offerId, prId },
      createDependencies({
        createdBy: creatorId,
        existingOrderId: orderId,
        status: "CLOSED",
      }),
    );

    expect(result).toEqual({ outcome: "EXISTING_ORDER", orderId });
  });

  it("admits only the active creator to a new order", async () => {
    const creatorResult = await getPRPlacementOrderingAdmission(
      { actorUserId: creatorId, offerId, prId },
      createDependencies(),
    );
    const participantResult = await getPRPlacementOrderingAdmission(
      { actorUserId: participantId, offerId, prId },
      createDependencies(),
    );

    expect(creatorResult).toEqual({ outcome: "CREATOR_ELIGIBLE" });
    expect(participantResult).toEqual({ outcome: "NON_CREATOR" });
  });

  it("returns inactive for an inactive viewer or a PR outside ordering status", async () => {
    const inactiveViewerResult = await getPRPlacementOrderingAdmission(
      { actorUserId: participantId, offerId, prId },
      createDependencies({ active: false }),
    );
    const inactivePrResult = await getPRPlacementOrderingAdmission(
      { actorUserId: creatorId, offerId, prId },
      createDependencies({ status: "OPEN" }),
    );

    expect(inactiveViewerResult).toEqual({ outcome: "INACTIVE" });
    expect(inactivePrResult).toEqual({ outcome: "INACTIVE" });
  });
});
