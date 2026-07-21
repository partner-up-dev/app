import type { TradeOrderId } from "../../../entities/trade-order";
import {
  type CommerceOrderDetailDebugContext,
  logCommerceOrderDetailDebug,
} from "../../../lib/commerce-order-detail-debug";
import { ProblemDetailsError } from "../../../lib/problem-details";
import type { RideHailingExecutionPhase } from "../../trade/contracts";
import type { RideHailingFareCorrectionRequired } from "../contracts";
import { RideHailingProviderSyncQueryError } from "../contracts";
import type {
  RideHailingProviderFinalSettlementResult,
  RideHailingProviderObservation,
  RideHailingProviderOrderDetail,
  RideHailingProviderVehicleLocation,
} from "../model";
import { createRideHailingReconciliationTransactionPort } from "../adapters/ride-hailing-reconciliation-transaction";
import { observeProviderOrderDetail } from "../services/provider-order-observation";
import { loadRideHailingProviderExecutionContext } from "./provider-execution-context";

export type RideHailingProviderSyncTrigger =
  | "ORDER_DETAIL_POLL"
  | "BROWSER_RECONCILE"
  | "PROVIDER_CALLBACK"
  | "CANCEL_FEE_PREVIEW"
  | "CANCEL_REQUEST";

export type RideHailingProviderSyncResult = {
  outcome: "RECONCILED" | "PROCESSING";
  mutated: boolean;
  providerDetail: RideHailingProviderOrderDetail | null;
  providerObservation: RideHailingProviderObservation | null;
  correctionRequired: RideHailingFareCorrectionRequired | null;
};

const terminalFinalSettlementPhases = new Set<RideHailingExecutionPhase>(["FINISHED", "CANCELLED"]);

const shouldQueryProviderLiveGeometry = (phase: RideHailingExecutionPhase): boolean =>
  phase === "ACCEPTED" || phase === "ARRIVED_AT_PICKUP" || phase === "IN_TRIP";

const resolveProviderNavigationRouteQueryKind = (
  phase: RideHailingExecutionPhase,
): "PICKUP" | "DROPOFF" | null => {
  if (phase === "ACCEPTED" || phase === "ARRIVED_AT_PICKUP") return "PICKUP";
  if (phase === "IN_TRIP") return "DROPOFF";
  return null;
};

const sanitizeProviderVehicleLocation = (
  location: RideHailingProviderVehicleLocation | null,
): Omit<RideHailingProviderVehicleLocation, "providerSnapshot"> | null => {
  if (!location) return null;
  return {
    capturedAt: location.capturedAt,
    headingDegrees: location.headingDegrees,
    latitude: location.latitude,
    longitude: location.longitude,
    speedKph: location.speedKph,
  };
};

const summarizeProviderDetail = (
  detail: RideHailingProviderOrderDetail,
): Record<string, unknown> => ({
  providerPhase: detail.phase,
  providerStatusLabel: detail.statusLabel,
  providerVehicleTypeCode: detail.providerVehicleTypeCode ?? null,
  providerVehicleTypeName: detail.providerVehicleTypeName ?? null,
  providerDriverName: detail.driver?.driverName ?? null,
  providerVehiclePlate: detail.vehicle?.plate ?? null,
  providerHasVehicleLocation: detail.vehicleLocation != null,
});

const buildProviderObservation = async (input: {
  context: Awaited<ReturnType<typeof loadRideHailingProviderExecutionContext>>;
  detail: RideHailingProviderOrderDetail;
  executionPhase: RideHailingExecutionPhase;
}): Promise<RideHailingProviderObservation> => {
  const navigationRouteQueryKind = resolveProviderNavigationRouteQueryKind(input.executionPhase);
  const vehicleLocation = shouldQueryProviderLiveGeometry(input.executionPhase)
    ? await input.context.port
        .queryDriverLocation({ providerOrderId: input.context.providerOrderId })
        .catch(() => null)
    : null;
  const navigationRoute =
    navigationRouteQueryKind === null
      ? null
      : await input.context.port
          .queryDriverRoute({
            providerOrderId: input.context.providerOrderId,
            routeKind: navigationRouteQueryKind,
          })
          .catch(() => null);

  return {
    phase: input.detail.phase,
    statusLabel: input.detail.statusLabel,
    providerVehicleTypeCode: input.detail.providerVehicleTypeCode ?? null,
    providerVehicleTypeName: input.detail.providerVehicleTypeName ?? null,
    driver: input.detail.driver,
    vehicle: input.detail.vehicle,
    vehicleLocation: sanitizeProviderVehicleLocation(
      vehicleLocation ?? input.detail.vehicleLocation,
    ),
    navigationRoute: navigationRoute
      ? {
          routeKind: navigationRoute.routeKind,
          polyline: navigationRoute.polyline,
          remainingDistanceMeters: navigationRoute.remainingDistanceMeters,
          remainingDurationSeconds: navigationRoute.remainingDurationSeconds,
          trafficLightCount: navigationRoute.trafficLightCount,
          vehicleLocation: sanitizeProviderVehicleLocation(navigationRoute.vehicleLocation),
        }
      : null,
  };
};

const shouldAttemptTerminalFinalSettlementQuery = (phase: RideHailingExecutionPhase): boolean =>
  terminalFinalSettlementPhases.has(phase);

export async function syncRideHailingOrderWithProvider(input: {
  orderId: TradeOrderId;
  expectedProviderInstanceId?: string | null;
  expectedProviderOrderId?: string | null;
  trigger: RideHailingProviderSyncTrigger;
  debug?: CommerceOrderDetailDebugContext;
}): Promise<RideHailingProviderSyncResult> {
  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.start", {
    inputOrderId: input.orderId,
    expectedProviderInstanceId: input.expectedProviderInstanceId ?? null,
    expectedProviderOrderId: input.expectedProviderOrderId ?? null,
    trigger: input.trigger,
  });

  let context: Awaited<ReturnType<typeof loadRideHailingProviderExecutionContext>>;
  try {
    context = await loadRideHailingProviderExecutionContext({
      orderId: input.orderId,
      expectedProviderInstanceId: input.expectedProviderInstanceId,
      expectedProviderOrderId: input.expectedProviderOrderId,
      debug: input.debug,
    });
  } catch (error) {
    if (
      input.trigger === "BROWSER_RECONCILE" &&
      error instanceof ProblemDetailsError &&
      error.status === 409 &&
      error.message === "RideHailing order is missing dispatch binding"
    ) {
      return {
        outcome: "PROCESSING",
        mutated: false,
        providerDetail: null,
        providerObservation: null,
        correctionRequired: null,
      };
    }
    throw error;
  }

  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.context", {
    localOrderId: context.orderId,
    rideExecutionPhase: context.executionPhase,
    rideDriverName: context.driverSnapshot?.driverName ?? null,
    rideVehiclePlate: context.vehicleSnapshot?.plate ?? null,
    providerInstanceId: context.providerInstance.id,
    providerOrderId: context.providerOrderId,
  });

  let providerDetail: RideHailingProviderOrderDetail;
  try {
    providerDetail = await context.port.queryOrderDetail({
      providerOrderId: context.providerOrderId,
    });
  } catch (error) {
    logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.provider-detail.error", {
      localOrderId: context.orderId,
      providerInstanceId: context.providerInstance.id,
      providerOrderId: context.providerOrderId,
      trigger: input.trigger,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack ?? null,
            }
          : error,
    });
    throw new RideHailingProviderSyncQueryError(
      "RideHailing provider order detail query failed",
      error,
    );
  }

  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.provider-detail.success", {
    localOrderId: context.orderId,
    providerInstanceId: context.providerInstance.id,
    providerOrderId: context.providerOrderId,
    trigger: input.trigger,
    ...summarizeProviderDetail(providerDetail),
  });

  const observation = observeProviderOrderDetail({ detail: providerDetail });
  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.observation", {
    localOrderId: context.orderId,
    providerOrderId: context.providerOrderId,
    trigger: input.trigger,
    observedExecutionPhase: observation.executionPhase ?? null,
    observedDriverName: observation.driverSnapshot?.driverName ?? null,
    observedVehiclePlate: observation.vehicleSnapshot?.plate ?? null,
  });

  const reconciliationTransaction = createRideHailingReconciliationTransactionPort();
  const phaseSync = await reconciliationTransaction.applyProviderObservation({
    orderId: input.orderId,
    expectedBinding: {
      providerInstanceId: context.providerInstance.id,
      providerOrderId: context.providerOrderId,
    },
    observation: {
      executionPhase: observation.executionPhase,
      driverSnapshot: observation.driverSnapshot,
      vehicleSnapshot: observation.vehicleSnapshot,
      providerVehicleTypeCode: providerDetail.providerVehicleTypeCode ?? null,
    },
    observedAt: new Date().toISOString(),
  });
  const effectiveExecutionPhase = phaseSync.effectiveExecutionPhase;

  let finalSettlementOutcome: {
    mutated: boolean;
    correctionRequired: RideHailingFareCorrectionRequired | null;
  } = { mutated: false, correctionRequired: null };
  const providerObservation = await buildProviderObservation({
    context,
    detail: providerDetail,
    executionPhase: effectiveExecutionPhase,
  });
  const shouldAttemptFinalSettlementQuery =
    shouldAttemptTerminalFinalSettlementQuery(effectiveExecutionPhase);

  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.post-phase-sync", {
    localOrderId: context.orderId,
    providerOrderId: context.providerOrderId,
    trigger: input.trigger,
    effectiveExecutionPhase,
    finalSettlementAlreadyCommitted: context.finalSettlementAlreadyCommitted,
    shouldAttemptFinalSettlementQuery,
  });

  if (shouldAttemptFinalSettlementQuery) {
    let finalSettlementResult: RideHailingProviderFinalSettlementResult | null = null;
    try {
      finalSettlementResult = await context.port.queryFinalSettlement({
        providerOrderId: context.providerOrderId,
      });
    } catch (error) {
      logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.query-final-settlement.error", {
        localOrderId: context.orderId,
        providerInstanceId: context.providerInstance.id,
        providerOrderId: context.providerOrderId,
        trigger: input.trigger,
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
                stack: error.stack ?? null,
              }
            : error,
      });
    }

    if (finalSettlementResult) {
      finalSettlementOutcome = await reconciliationTransaction.commitTerminalSettlement({
        orderId: input.orderId,
        expectedBinding: {
          providerInstanceId: context.providerInstance.id,
          providerOrderId: context.providerOrderId,
        },
        settlement: {
          amountFen: finalSettlementResult.amountFen,
          currency: finalSettlementResult.currency,
          providerOrderId: finalSettlementResult.providerOrderId,
        },
      });
    } else {
      logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.query-final-settlement.miss", {
        localOrderId: context.orderId,
        providerOrderId: context.providerOrderId,
        trigger: input.trigger,
        effectiveExecutionPhase,
      });
    }
  }

  const mutated = phaseSync.mutated || finalSettlementOutcome.mutated;
  logCommerceOrderDetailDebug(input.debug, "ride-provider-sync.complete", {
    inputOrderId: input.orderId,
    expectedProviderInstanceId: input.expectedProviderInstanceId ?? null,
    expectedProviderOrderId: input.expectedProviderOrderId ?? null,
    trigger: input.trigger,
    mutated,
    ...summarizeProviderDetail(providerDetail),
  });

  return {
    outcome: "RECONCILED",
    mutated,
    providerDetail,
    providerObservation,
    correctionRequired: finalSettlementOutcome.correctionRequired,
  };
}
