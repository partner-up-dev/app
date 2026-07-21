import type { TradeOrderId } from "../../entities/trade-order";
import type { CommerceOrderDetailDebugContext } from "../../lib/commerce-order-detail-debug";
import type {
  RideHailingFareCorrectionRequired,
  RideHailingProviderBindingExpectation,
  RideHailingProviderObservationForReconciliation,
} from "./contracts";
import type { RideHailingProviderInstance } from "../../entities/ride-hailing-provider";
import type {
  RideHailingProviderCancelInput,
  RideHailingProviderCreateRideInput,
  RideHailingProviderCreateRideSubmission,
  RideHailingProviderEstimateInput,
  RideHailingProviderVehicleQuote,
} from "./model";
import { resolveCaocaoOrderStatusCallbackUrl } from "./services/caocao-provider";
import { createRideHailingProviderPort } from "./services/ride-hailing-provider-registry";

/**
 * Trade-facing provider capability. It intentionally omits raw callback
 * parsing, live-observation and provider-specific input fields; those remain
 * RideHailing implementation details.
 */
export type RideHailingDispatchPort = {
  buildExternalOrderId(orderId: string): string;
  prepareCreateRideSubmission(
    candidates: RideHailingProviderCreateRideInput["candidates"],
  ): RideHailingProviderCreateRideSubmission;
  estimate(input: RideHailingProviderEstimateInput): Promise<RideHailingProviderVehicleQuote>;
  createRide(input: Omit<RideHailingProviderCreateRideInput, "callbackInfo">): Promise<{
    providerOrderId: string;
    externalOrderId: string;
    dispatchSubmission: RideHailingProviderCreateRideSubmission;
    providerSnapshot: unknown;
  }>;
  queryCancelFee(input: { providerOrderId: string }): Promise<{
    providerOrderId: string;
    cancelFeeFen: number;
    providerSnapshot: unknown;
  }>;
  cancelRide(input: RideHailingProviderCancelInput): Promise<{
    providerOrderId: string;
    cancelFeeFen: number;
    providerSnapshot: unknown;
  }>;
  confirmFee(input: { providerOrderId: string; allowanceAmountFen?: number | null }): Promise<void>;
};

/**
 * RideHailing owns the two short atomic commits that reconcile a provider
 * observation with local Trade/Ride/Bill facts. The Port exposes semantic
 * inputs only: neither provider I/O nor repositories/executors can cross it.
 */
export type RideHailingReconciliationTransactionPort = {
  applyProviderObservation(input: {
    orderId: string;
    expectedBinding: RideHailingProviderBindingExpectation;
    observation: RideHailingProviderObservationForReconciliation;
    observedAt: string;
  }): Promise<{
    mutated: boolean;
    effectiveExecutionPhase: NonNullable<
      RideHailingProviderObservationForReconciliation["executionPhase"]
    >;
  }>;
  commitTerminalSettlement(input: {
    orderId: string;
    expectedBinding: RideHailingProviderBindingExpectation;
    settlement: RideHailingTerminalSettlementObservation;
  }): Promise<{
    mutated: boolean;
    correctionRequired: RideHailingFareCorrectionRequired | null;
  }>;
};

/**
 * The terminal fare facts required by the atomic commit. Raw provider payloads
 * remain in provider adapters and are not a Transaction Port concern.
 */
export type RideHailingTerminalSettlementObservation = {
  amountFen: number;
  currency: "CNY";
  providerOrderId: string;
};

export function createRideHailingDispatchPort(input: {
  providerInstance: RideHailingProviderInstance;
  fetchImpl?: typeof fetch;
}): RideHailingDispatchPort {
  const providerPort = createRideHailingProviderPort(input);

  return {
    buildExternalOrderId: (orderId) => providerPort.buildExternalOrderId(orderId),
    prepareCreateRideSubmission: (candidates) => providerPort.buildCreateRideSubmission(candidates),
    estimate: (estimateInput) => providerPort.estimate(estimateInput),
    createRide: (createInput) =>
      providerPort.createRide({
        ...createInput,
        callbackInfo: providerPort.buildCreateRideCallbackInfo(),
      }),
    queryCancelFee: (feeInput) => providerPort.queryCancelFee(feeInput),
    cancelRide: (cancelInput) => providerPort.cancelRide(cancelInput),
    confirmFee: (feeInput) => providerPort.confirmFee(feeInput),
  };
}

/**
 * Provider-owned operator projection. Callers ask for the active provider's
 * order-status callback endpoint without depending on a provider-specific
 * adapter implementation.
 */
export function resolveRideHailingProviderOrderStatusCallbackUrl(
  providerInstance: RideHailingProviderInstance,
): string | null {
  if (
    providerInstance.providerType !== "CAOCAO" ||
    providerInstance.config.adapterMode !== "CAOCAO_OPEN_API" ||
    !providerInstance.config.callbackBaseUrl
  ) {
    return null;
  }

  return resolveCaocaoOrderStatusCallbackUrl(providerInstance);
}

/**
 * Trade's cancellation flow needs a current provider-backed decision, but it
 * must not depend on RideHailing's sync implementation or command barrel.
 * This narrow Port deliberately discards the provider result.
 */
export async function synchronizeRideHailingBeforeCancellation(input: {
  orderId: string;
  purpose: "FEE_PREVIEW" | "CANCEL_REQUEST";
  debug?: CommerceOrderDetailDebugContext;
}): Promise<void> {
  // Keep the normal dispatch Port loadable without constructing the
  // reconciliation persistence adapter. Only cancellation actually needs the
  // provider-observation workflow and its database dependency.
  const { syncRideHailingOrderWithProvider } =
    await import("./use-cases/sync-ride-hailing-order-with-provider");
  await syncRideHailingOrderWithProvider({
    orderId: input.orderId as TradeOrderId,
    trigger: input.purpose === "FEE_PREVIEW" ? "CANCEL_FEE_PREVIEW" : "CANCEL_REQUEST",
    debug: input.debug,
  });
}
