import type { RideHailingProviderInstanceId } from "../../../entities/ride-hailing-provider";
import type { TradeOrder, TradeOrderId } from "../../../entities/trade-order";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
import { ProblemDetailsError, throwHttpProblem } from "../../../lib/problem-details";
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
  RideHailingDispatchBindingSnapshot,
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingRiderSnapshot,
  RideHailingRouteSnapshot,
  RideHailingVehicleSnapshot,
} from "../model";
import { getOrderItemSkuName, getRideHailingChoiceSetItem } from "../services";

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

const summarizeProviderLiveError = (error: unknown): Record<string, unknown> => {
  if (error instanceof ProblemDetailsError) {
    return {
      errorCode: error.code,
      errorMessage: error.message,
      errorName: error.name,
      errorStatus: error.status,
      errorType: error.type,
    };
  }
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack ?? null,
    };
  }
  return {
    errorValue: error,
  };
};

const summarizeProviderDetailProjection = (
  detail: ProviderDetailProjection | null,
): Record<string, unknown> => ({
  providerPhase: detail?.phase ?? null,
  providerStatusLabel: detail?.statusLabel ?? null,
  providerDriverName: detail?.driver?.driverName ?? null,
  providerVehiclePlate: detail?.vehicle?.plate ?? null,
  providerHasVehicleLocation: detail?.vehicleLocation != null,
  providerHasNavigationRoute: detail?.navigationRoute != null,
});

const writeRideHailingLiveRouteQueryErrorLog = (payload: Record<string, unknown>): void => {
  process.stdout.write(
    `${JSON.stringify({
      marker: "RideHailingLiveRouteQueryError",
      ...payload,
    })}\n`,
  );
};

const writeRideHailingLiveRouteQueryDecisionLog = (payload: Record<string, unknown>): void => {
  process.stdout.write(
    `${JSON.stringify({
      marker: "RideHailingLiveRouteQueryDecision",
      ...payload,
    })}\n`,
  );
};

const queryOptionalProviderLive = async <T>(input: {
  onError?: (error: unknown) => void;
  operation: () => Promise<T>;
}): Promise<T | null> => {
  try {
    return await input.operation();
  } catch (error) {
    input.onError?.(error);
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
  debug?: CommerceOrderDetailDebugContext;
}): Promise<RideHailingOrderDetailProjection> {
  let order = input.order;
  let choiceSetItem = getRideHailingChoiceSetItem(order.items);
  let rideOrder = await rideOrderRepo.findByOrderId(order.id);
  if (!rideOrder) {
    logCommerceOrderDetailDebug(input.debug, "ride-detail.build.ride-order-missing", {
      localOrderId: order.id,
      localOrderStatus: order.status,
    });
    return throwHttpProblem({
      status: 500,
      detail: "RideHailing order facts are missing",
    });
  }
  let dispatchBinding: RideHailingDispatchBindingSnapshot | null =
    rideOrder.dispatchBinding ?? null;
  let syncedProviderDetail: RideHailingProviderOrderDetail | null = null;

  logCommerceOrderDetailDebug(input.debug, "ride-detail.build.start", {
    localOrderId: order.id,
    localOrderStatus: order.status,
    providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
    providerOrderId: dispatchBinding?.providerOrderId ?? null,
  });

  if (dispatchBinding?.providerOrderId) {
    const syncProviderInstanceId = dispatchBinding.providerInstanceId;
    const syncProviderOrderId = dispatchBinding.providerOrderId;
    try {
      const syncResult = await syncRideHailingOrderWithProvider({
        orderId: order.id,
        expectedProviderInstanceId: syncProviderInstanceId,
        expectedProviderOrderId: syncProviderOrderId,
        trigger: "ORDER_DETAIL_POLL",
        debug: input.debug,
      });
      syncedProviderDetail = syncResult.providerDetail;
      logCommerceOrderDetailDebug(input.debug, "ride-detail.build.sync-result", {
        localOrderId: order.id,
        providerInstanceId: syncProviderInstanceId,
        providerOrderId: syncProviderOrderId,
        syncMutated: syncResult.mutated,
        providerPhase: syncedProviderDetail.phase,
        providerStatusLabel: syncedProviderDetail.statusLabel,
        providerDriverName: syncedProviderDetail.driver?.driverName ?? null,
        providerVehiclePlate: syncedProviderDetail.vehicle?.plate ?? null,
      });
      if (syncResult.mutated) {
        const [reloadedOrder, reloadedRideOrder] = await Promise.all([
          tradeOrderRepo.findById(order.id),
          rideOrderRepo.findByOrderId(order.id),
        ]);
        if (reloadedOrder && reloadedRideOrder) {
          order = reloadedOrder;
          rideOrder = reloadedRideOrder;
          choiceSetItem = getRideHailingChoiceSetItem(order.items);
          dispatchBinding = rideOrder.dispatchBinding ?? null;
          logCommerceOrderDetailDebug(input.debug, "ride-detail.build.reload-after-sync", {
            localOrderId: order.id,
            localOrderStatus: order.status,
            providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
            providerOrderId: dispatchBinding?.providerOrderId ?? null,
          });
        }
      }
    } catch (error) {
      if (!(error instanceof RideHailingProviderSyncQueryError)) {
        throw error;
      }
      logCommerceOrderDetailDebug(input.debug, "ride-detail.build.sync-query-error", {
        localOrderId: order.id,
        providerInstanceId: syncProviderInstanceId,
        providerOrderId: syncProviderOrderId,
        error: summarizeProviderLiveError(error.originalError),
      });
    }
  }

  let providerDetail: ProviderDetailProjection | null = null;
  const shouldQueryLiveGeometry = shouldQueryProviderLiveGeometry(rideOrder.executionPhase);
  const navigationRouteQueryKind = resolveProviderNavigationRouteQueryKind(
    rideOrder.executionPhase,
  );
  let routeQueryAttempted = false;
  let routeQuerySucceeded = false;
  let routeQuerySkippedReason: string | null = null;
  if (dispatchBinding?.providerOrderId && syncedProviderDetail) {
    const provider = await providerRepo.findById(
      dispatchBinding.providerInstanceId as RideHailingProviderInstanceId,
    );
    if (provider) {
      const port = createRideHailingProviderPort({ providerInstance: provider });
      logCommerceOrderDetailDebug(input.debug, "ride-detail.build.live-query-plan", {
        localOrderId: order.id,
        rideExecutionPhase: rideOrder.executionPhase,
        providerInstanceId: dispatchBinding.providerInstanceId,
        providerOrderId: dispatchBinding.providerOrderId,
        shouldQueryLiveGeometry,
        navigationRouteQueryKind,
      });
      const vehicleLocation = shouldQueryLiveGeometry
        ? await queryOptionalProviderLive({
            onError: (error) => {
              logCommerceOrderDetailDebug(input.debug, "ride-detail.build.driver-location.error", {
                localOrderId: order.id,
                rideExecutionPhase: rideOrder.executionPhase,
                providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
                providerOrderId: dispatchBinding?.providerOrderId ?? null,
                ...summarizeProviderLiveError(error),
              });
            },
            operation: () =>
              port.queryDriverLocation({
                providerOrderId: dispatchBinding.providerOrderId,
              }),
          })
        : null;
      let navigationRoute: RideHailingProviderNavigationRoute | null = null;
      if (!shouldQueryLiveGeometry) {
        routeQuerySkippedReason = "execution_phase_not_live_geometry";
      } else if (!navigationRouteQueryKind) {
        routeQuerySkippedReason = "route_kind_not_resolved";
      } else {
        routeQueryAttempted = true;
        navigationRoute = await queryOptionalProviderLive({
          onError: (error) => {
            writeRideHailingLiveRouteQueryErrorLog({
              executionPhase: rideOrder.executionPhase,
              orderId: order.id,
              providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
              providerOrderId: dispatchBinding?.providerOrderId ?? null,
              routeKind: navigationRouteQueryKind,
              ...summarizeProviderLiveError(error),
            });
            logCommerceOrderDetailDebug(input.debug, "ride-detail.build.driver-route.error", {
              localOrderId: order.id,
              rideExecutionPhase: rideOrder.executionPhase,
              providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
              providerOrderId: dispatchBinding?.providerOrderId ?? null,
              routeKind: navigationRouteQueryKind,
              ...summarizeProviderLiveError(error),
            });
          },
          operation: () =>
            port.queryDriverRoute({
              providerOrderId: dispatchBinding.providerOrderId,
              routeKind: navigationRouteQueryKind,
            }),
        });
        routeQuerySucceeded = navigationRoute !== null;
      }
      providerDetail = projectProviderDetail({
        detail: syncedProviderDetail,
        navigationRoute,
        vehicleLocation,
      });
      logCommerceOrderDetailDebug(input.debug, "ride-detail.build.live-query-result", {
        localOrderId: order.id,
        rideExecutionPhase: rideOrder.executionPhase,
        providerInstanceId: dispatchBinding.providerInstanceId,
        providerOrderId: dispatchBinding.providerOrderId,
        shouldQueryLiveGeometry,
        navigationRouteQueryKind,
        vehicleLocationCapturedAt: vehicleLocation?.capturedAt ?? null,
        navigationRouteKind: navigationRoute?.routeKind ?? null,
        ...summarizeProviderDetailProjection(providerDetail),
      });
    } else {
      routeQuerySkippedReason = "provider_instance_missing";
      logCommerceOrderDetailDebug(input.debug, "ride-detail.build.provider-instance-missing", {
        localOrderId: order.id,
        providerInstanceId: dispatchBinding.providerInstanceId,
        providerOrderId: dispatchBinding.providerOrderId,
      });
    }
  } else if (!dispatchBinding?.providerOrderId) {
    routeQuerySkippedReason = "provider_order_missing";
  } else {
    routeQuerySkippedReason = "provider_detail_unavailable";
  }

  writeRideHailingLiveRouteQueryDecisionLog({
    executionPhase: rideOrder.executionPhase,
    orderId: order.id,
    providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
    providerOrderId: dispatchBinding?.providerOrderId ?? null,
    routeKind: navigationRouteQueryKind,
    routeQueryAttempted,
    routeQuerySkippedReason,
    routeQuerySucceeded,
    shouldQueryLiveGeometry,
    syncedProviderDetailAvailable: syncedProviderDetail !== null,
  });

  const result = {
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
      providerOrderId: dispatchBinding?.providerOrderId ?? null,
    },
    executionPhase: rideOrder.executionPhase,
    driver: rideOrder.driverSnapshot ?? providerDetail?.driver ?? null,
    vehicle: rideOrder.vehicleSnapshot ?? providerDetail?.vehicle ?? null,
    live: providerDetail,
  };

  logCommerceOrderDetailDebug(input.debug, "ride-detail.build.complete", {
    localOrderId: order.id,
    localOrderStatus: order.status,
    rideExecutionPhase: result.executionPhase,
    rideDriverName: result.driver?.driverName ?? null,
    rideVehiclePlate: result.vehicle?.plate ?? null,
    candidateVehicleCount: result.candidateVehicles.length,
    providerInstanceId: dispatchBinding?.providerInstanceId ?? null,
    providerOrderId: result.provider.providerOrderId,
    ...summarizeProviderDetailProjection(result.live),
  });

  return result;
}

export async function confirmRideHailingProviderFeeAfterPayment(input: { orderId: string }) {
  const rideOrder = await rideOrderRepo.findByOrderId(input.orderId as TradeOrderId);
  if (!rideOrder) {
    return { applied: false, reason: "RideHailing order facts are missing" };
  }
  const dispatchBinding = rideOrder.dispatchBinding;
  if (!dispatchBinding?.providerOrderId) {
    return { applied: false, reason: "RideHailing provider order is missing" };
  }
  const provider = await providerRepo.findById(
    dispatchBinding.providerInstanceId as RideHailingProviderInstanceId,
  );
  if (!provider) {
    return { applied: false, reason: "RideHailing provider instance is missing" };
  }
  const port = createRideHailingProviderPort({ providerInstance: provider });
  await port.confirmFee({
    providerOrderId: dispatchBinding.providerOrderId,
  });
  return {
    applied: true,
    reason: "RideHailing provider fee confirmed",
    orderId: input.orderId,
  };
}
