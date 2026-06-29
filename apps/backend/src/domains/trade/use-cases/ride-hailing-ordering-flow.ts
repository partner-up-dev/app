import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import { throwHttpProblem } from "../../../lib/problem-details";
import { RideHailingOrderRepository } from "../../../repositories/RideHailingOrderRepository";
import { RideHailingProviderInstanceRepository } from "../../../repositories/RideHailingProviderInstanceRepository";
import { TradeOrderRepository } from "../../../repositories/TradeOrderRepository";
import type {
  RideHailingProviderNavigationRoute,
  RideHailingProviderNavigationRouteQueryKind,
  RideHailingProviderOrderDetail,
  RideHailingProviderVehicleLocation,
} from "../../ride-hailing";
import {
  createRideHailingProviderPort,
  RideHailingProviderSyncQueryError,
  syncRideHailingOrderWithProvider,
} from "../../ride-hailing";
import type {
  RideHailingChoiceSetCandidateSnapshot,
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  RideHailingVehicleSnapshot,
} from "../model";
import {
  getOrderItemSkuName,
  getRideHailingChoiceSetItem,
  getRideHailingProviderBinding,
} from "../services";

const providerRepo = new RideHailingProviderInstanceRepository();
const rideOrderRepo = new RideHailingOrderRepository();
const tradeOrderRepo = new TradeOrderRepository();

type ProviderVehicleLocationProjection = Omit<
  RideHailingProviderVehicleLocation,
  "providerSnapshot"
>;

type ProviderNavigationRouteProjection = Omit<
  RideHailingProviderNavigationRoute,
  "providerSnapshot" | "vehicleLocation"
> & {
  vehicleLocation: ProviderVehicleLocationProjection | null;
};

type ProviderDetailProjection = Omit<
  RideHailingProviderOrderDetail,
  "providerSnapshot" | "vehicleLocation"
> & {
  navigationRoute: ProviderNavigationRouteProjection | null;
  vehicleLocation: ProviderVehicleLocationProjection | null;
};

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
  live: ProviderDetailProjection | null;
};

const projectProviderVehicleLocation = (
  location: RideHailingProviderVehicleLocation | null,
): ProviderVehicleLocationProjection | null => {
  if (!location) return null;
  return {
    capturedAt: location.capturedAt,
    headingDegrees: location.headingDegrees,
    latitude: location.latitude,
    longitude: location.longitude,
    speedKph: location.speedKph,
  };
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

const projectProviderNavigationRoute = (
  route: RideHailingProviderNavigationRoute | null,
): ProviderNavigationRouteProjection | null => {
  if (!route) return null;
  return {
    polyline: route.polyline,
    remainingDistanceMeters: route.remainingDistanceMeters,
    remainingDurationSeconds: route.remainingDurationSeconds,
    routeKind: route.routeKind,
    trafficLightCount: route.trafficLightCount,
    vehicleLocation: projectProviderVehicleLocation(route.vehicleLocation),
  };
};

const shouldQueryProviderLiveGeometry = (phase: RideHailingExecutionPhase): boolean =>
  phase === "ACCEPTED" || phase === "ARRIVED_AT_PICKUP" || phase === "IN_TRIP";

const resolveProviderNavigationRouteQueryKind = (
  phase: RideHailingExecutionPhase,
): RideHailingProviderNavigationRouteQueryKind | null => {
  if (phase === "ACCEPTED" || phase === "ARRIVED_AT_PICKUP") return "PICKUP";
  if (phase === "IN_TRIP") return "DROPOFF";
  return null;
};

const queryOptionalProviderLive = async <T>(operation: () => Promise<T>): Promise<T | null> => {
  try {
    return await operation();
  } catch {
    return null;
  }
};

const projectProviderDetail = (input: {
  detail: RideHailingProviderOrderDetail;
  navigationRoute: RideHailingProviderNavigationRoute | null;
  vehicleLocation: RideHailingProviderVehicleLocation | null;
}): ProviderDetailProjection => {
  return {
    driver: input.detail.driver,
    finalAmountFen: input.detail.finalAmountFen,
    navigationRoute: projectProviderNavigationRoute(input.navigationRoute),
    phase: input.detail.phase,
    statusLabel: input.detail.statusLabel,
    vehicle: input.detail.vehicle,
    vehicleLocation: projectProviderVehicleLocation(
      input.vehicleLocation ?? input.detail.vehicleLocation,
    ),
  };
};

export async function buildRideHailingDetailProjection(input: {
  order: TradeOrder;
}): Promise<RideHailingOrderDetailProjection> {
  let order = input.order;
  let choiceSetItem = getRideHailingChoiceSetItem(order.items);
  let providerBinding = choiceSetItem ? getRideHailingProviderBinding(choiceSetItem) : null;
  let syncedProviderDetail: RideHailingProviderOrderDetail | null = null;
  if (providerBinding?.providerOrderId) {
    try {
      const syncResult = await syncRideHailingOrderWithProvider({
        orderId: order.id,
        expectedProviderInstanceId: providerBinding.providerInstanceId,
        expectedProviderOrderId: providerBinding.providerOrderId,
        trigger: "ORDER_DETAIL_POLL",
      });
      syncedProviderDetail = syncResult.providerDetail;
      if (syncResult.mutated) {
        const reloadedOrder = await tradeOrderRepo.findById(order.id);
        if (reloadedOrder) {
          order = reloadedOrder;
          choiceSetItem = getRideHailingChoiceSetItem(order.items);
          providerBinding = choiceSetItem ? getRideHailingProviderBinding(choiceSetItem) : null;
        }
      }
    } catch (error) {
      if (!(error instanceof RideHailingProviderSyncQueryError)) {
        throw error;
      }
    }
  }

  const rideOrder = await rideOrderRepo.findByOrderId(order.id);
  if (!rideOrder) {
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }

  let providerDetail: ProviderDetailProjection | null = null;
  if (providerBinding?.providerOrderId && syncedProviderDetail) {
    const provider = await providerRepo.findById(
      providerBinding.providerInstanceId as RideHailingProviderInstanceId,
    );
    if (provider) {
      const port = createRideHailingProviderPort({ providerInstance: provider });
      const shouldQueryLiveGeometry = shouldQueryProviderLiveGeometry(rideOrder.executionPhase);
      const navigationRouteQueryKind = resolveProviderNavigationRouteQueryKind(
        rideOrder.executionPhase,
      );
      const vehicleLocation = shouldQueryLiveGeometry
        ? await queryOptionalProviderLive(() =>
            port.queryDriverLocation({
              providerOrderId: providerBinding.providerOrderId,
            }),
          )
        : null;
      const navigationRoute = navigationRouteQueryKind
        ? await queryOptionalProviderLive(() =>
            port.queryDriverRoute({
              providerOrderId: providerBinding.providerOrderId,
              routeKind: navigationRouteQueryKind,
            }),
          )
        : null;
      providerDetail = projectProviderDetail({
        detail: syncedProviderDetail,
        navigationRoute,
        vehicleLocation,
      });
    }
  }

  return {
    route: rideOrder.routeSnapshot,
    departureAt: rideOrder.departureAt?.toISOString() ?? null,
    riders: rideOrder.riders,
    contactPhone: rideOrder.contactPhone,
    selectedVehicleName: choiceSetItem
      ? getOrderItemSkuName(choiceSetItem)
      : order.items[0]
        ? getOrderItemSkuName(order.items[0])
        : "曹操出行",
    candidateVehicles: choiceSetItem?.candidates.map(projectCandidateVehicle) ?? [],
    provider: {
      providerOrderId: providerBinding?.providerOrderId ?? null,
    },
    executionPhase: rideOrder.executionPhase,
    driver: rideOrder.driverSnapshot ?? providerDetail?.driver ?? null,
    vehicle: rideOrder.vehicleSnapshot ?? providerDetail?.vehicle ?? null,
    live: providerDetail,
  };
}

export async function confirmRideHailingProviderFeeAfterPayment(input: { orderId: string }) {
  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId as TradeOrderId);
  if (!rideOrder) {
    return { applied: false, reason: "RideHailing order facts are missing" };
  }
  const order = await tradeOrderRepo.findById(input.orderId as TradeOrderId);
  const choiceSetItem = order ? getRideHailingChoiceSetItem(order.items) : null;
  const providerBinding = choiceSetItem ? getRideHailingProviderBinding(choiceSetItem) : null;
  if (!providerBinding?.providerOrderId) {
    return { applied: false, reason: "RideHailing provider order is missing" };
  }
  const provider = await providerRepo.findById(
    providerBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!provider) {
    return { applied: false, reason: "RideHailing provider instance is missing" };
  }
  const port = createRideHailingProviderPort({ providerInstance: provider });
  await port.confirmFee({
    providerOrderId: providerBinding.providerOrderId,
  });
  return {
    applied: true,
    reason: "RideHailing provider fee confirmed",
    orderId: input.orderId,
  };
}
