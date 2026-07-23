import type { TradeOrder } from "../../../entities/trade-order";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import type {
  RideHailingChoiceSetCandidateSnapshot,
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  RideHailingVehicleSnapshot,
} from "../model";
import { getOrderItemSkuName, getRideHailingChoiceSetItem } from "../services";

const rideOrderRepo = new RideHailingOrderRepository();

type RideHailingCandidateVehicleProjection = {
  skuId: number;
  displayName: string;
  quoteAmountFen: number;
  previewImageAssetId: string | null;
};

export type RideHailingOrderDetailProjection = {
  route: RideHailingRouteSnapshot;
  departureAt: string | null;
  riders: RideHailingRiderSnapshot[];
  contactPhone: string;
  selectedVehicleName: string;
  candidateVehicles: RideHailingCandidateVehicleProjection[];
  provider: {
    providerOrderId: string | null;
  };
  executionPhase: RideHailingExecutionPhase;
  driver: RideHailingDriverSnapshot | null;
  vehicle: RideHailingVehicleSnapshot | null;
  live: null;
};

const firstPresentString = (values: readonly (string | null | undefined)[]): string | null => {
  for (const value of values) {
    const normalized = value?.trim() ?? "";
    if (normalized.length > 0) return normalized;
  }
  return null;
};

const projectCandidateVehicle = (
  candidate: RideHailingChoiceSetCandidateSnapshot,
): RideHailingCandidateVehicleProjection => ({
  displayName: candidate.quoteSnapshot.displayName || candidate.sku.name,
  previewImageAssetId: firstPresentString([
    candidate.sku.presentationSnapshot.heroImageAssetIds[0],
    candidate.sku.presentationSnapshot.detailImageAssetIds[0],
  ]),
  quoteAmountFen: candidate.quoteSnapshot.amountFen,
  skuId: candidate.sku.id,
});

/**
 * Order Detail is deliberately a local projection. Provider observation is
 * performed only by the explicit RideHailing reconciliation command.
 */
export async function buildRideHailingDetailProjection(input: {
  order: TradeOrder;
  debug?: CommerceOrderDetailDebugContext;
}): Promise<RideHailingOrderDetailProjection> {
  const rideOrder = await rideOrderRepo.findByOrderId(input.order.id);
  if (!rideOrder) {
    logCommerceOrderDetailDebug(input.debug, "ride-detail.build.ride-order-missing", {
      localOrderId: input.order.id,
      localOrderStatus: input.order.status,
    });
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }

  const choiceSetItem = getRideHailingChoiceSetItem(input.order.items);
  const dispatchBinding = rideOrder.dispatchBinding;
  const result: RideHailingOrderDetailProjection = {
    route: rideOrder.routeSnapshot,
    departureAt: rideOrder.departureAt?.toISOString() ?? null,
    riders: rideOrder.riders,
    contactPhone: rideOrder.contactPhone,
    selectedVehicleName: choiceSetItem
      ? getOrderItemSkuName(choiceSetItem)
      : input.order.items[0]
        ? getOrderItemSkuName(input.order.items[0])
        : "曹操出行",
    candidateVehicles: choiceSetItem?.candidates.map(projectCandidateVehicle) ?? [],
    provider: {
      providerOrderId: dispatchBinding?.providerOrderId ?? null,
    },
    executionPhase: rideOrder.executionPhase,
    driver: rideOrder.driverSnapshot,
    vehicle: rideOrder.vehicleSnapshot,
    live: null,
  };

  logCommerceOrderDetailDebug(input.debug, "ride-detail.build.complete", {
    localOrderId: input.order.id,
    localOrderStatus: input.order.status,
    rideExecutionPhase: result.executionPhase,
    providerOrderId: result.provider.providerOrderId,
    liveProviderQuery: false,
  });
  return result;
}
