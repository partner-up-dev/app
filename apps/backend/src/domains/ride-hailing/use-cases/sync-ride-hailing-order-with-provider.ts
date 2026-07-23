import type { TradeOrderId } from "../../../entities/trade-order";
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
}): Promise<RideHailingProviderSyncResult> {
  let context: Awaited<ReturnType<typeof loadRideHailingProviderExecutionContext>>;
  try {
    context = await loadRideHailingProviderExecutionContext({
      orderId: input.orderId,
      expectedProviderInstanceId: input.expectedProviderInstanceId,
      expectedProviderOrderId: input.expectedProviderOrderId,
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

  let providerDetail: RideHailingProviderOrderDetail;
  try {
    providerDetail = await context.port.queryOrderDetail({
      providerOrderId: context.providerOrderId,
    });
  } catch (error) {
    throw new RideHailingProviderSyncQueryError(
      "RideHailing provider order detail query failed",
      error,
    );
  }

  const observation = observeProviderOrderDetail({ detail: providerDetail });

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

  if (shouldAttemptFinalSettlementQuery) {
    let finalSettlementResult: RideHailingProviderFinalSettlementResult | null = null;
    try {
      finalSettlementResult = await context.port.queryFinalSettlement({
        providerOrderId: context.providerOrderId,
      });
    } catch {
      // Final-settlement lookup remains best-effort; absence preserves the current local state.
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
    }
  }

  const mutated = phaseSync.mutated || finalSettlementOutcome.mutated;
  return {
    outcome: "RECONCILED",
    mutated,
    providerDetail,
    providerObservation,
    correctionRequired: finalSettlementOutcome.correctionRequired,
  };
}
