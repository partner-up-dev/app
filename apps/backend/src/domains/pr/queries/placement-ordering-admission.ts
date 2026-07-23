import type { OfferId } from "../../../entities/offer";
import type { PRId } from "../../../entities/partner-request";
import type { TradeOrderId } from "../../../entities/trade-order";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import { isPROrderAttachableStatus } from "../services/status-rules";

export type PRPlacementOrderingAdmission =
  | { outcome: "EXISTING_ORDER"; orderId: TradeOrderId }
  | { outcome: "CREATOR_ELIGIBLE" }
  | { outcome: "NON_CREATOR" }
  | { outcome: "INACTIVE" };

export type PlacementOrderingAdmissionDependencies = {
  findActiveParticipant: (prId: PRId, userId: UserId) => Promise<{ userId: UserId } | null>;
  findPartnerRequest: (prId: PRId) => Promise<{
    createdBy: UserId | null;
    orders: TradeOrderId[];
    status: string;
  } | null>;
  listActiveOrders: (input: {
    ids: TradeOrderId[];
    offerId: OfferId;
  }) => Promise<Array<{ id: TradeOrderId }>>;
};

const partnerRepo = new PartnerRepository();
const partnerRequestRepo = new PartnerRequestRepository();
const tradeOrderRepo = new TradeOrderRepository();

const defaultDependencies: PlacementOrderingAdmissionDependencies = {
  findActiveParticipant: (prId, userId) => partnerRepo.findActiveByPrIdAndUserId(prId, userId),
  findPartnerRequest: (prId) => partnerRequestRepo.findById(prId),
  listActiveOrders: ({ ids, offerId }) =>
    tradeOrderRepo.listByIdsOfferAndStatuses({
      ids,
      offerId,
      statuses: ["INITIATING", "OPEN"],
    }),
};

/**
 * PR owns whether a viewer may follow a Placement into a new or existing
 * PR-attached order. Existing active orders win over new-order eligibility.
 */
export async function getPRPlacementOrderingAdmission(
  input: {
    prId: PRId;
    offerId: OfferId;
    actorUserId: UserId | null;
  },
  dependencies: PlacementOrderingAdmissionDependencies = defaultDependencies,
): Promise<PRPlacementOrderingAdmission> {
  if (!input.actorUserId) {
    return { outcome: "INACTIVE" };
  }

  const [request, activeParticipant] = await Promise.all([
    dependencies.findPartnerRequest(input.prId),
    dependencies.findActiveParticipant(input.prId, input.actorUserId),
  ]);
  if (!request || !activeParticipant) {
    return { outcome: "INACTIVE" };
  }

  const [existingOrder] = await dependencies.listActiveOrders({
    ids: request.orders,
    offerId: input.offerId,
  });
  if (existingOrder) {
    return { outcome: "EXISTING_ORDER", orderId: existingOrder.id };
  }

  if (!isPROrderAttachableStatus(request.status)) {
    return { outcome: "INACTIVE" };
  }

  return request.createdBy === input.actorUserId
    ? { outcome: "CREATOR_ELIGIBLE" }
    : { outcome: "NON_CREATOR" };
}
