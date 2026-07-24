import type { TradeOrderId } from "../../entities/trade-order";
import type { RideHailingProviderInstance } from "../../entities/ride-hailing-provider";
import type { BillLinePaymentExecutionSettlement } from "../bill/contracts";
import type {
  RideHailingProviderCancelInput,
  RideHailingProviderCreateRideInput,
  RideHailingProviderCreateRideSubmission,
  RideHailingProviderEstimateInput,
  RideHailingProviderVehicleQuote,
} from "./model";
import { resolveCaocaoOrderStatusCallbackUrl } from "./services/caocao-provider";
import { createRideHailingProviderPort } from "./services/ride-hailing-provider-registry";

export type {
  RideHailingReconciliationTransactionPort,
  RideHailingTerminalSettlementObservation,
} from "./contracts";

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
}): Promise<void> {
  // Keep the normal dispatch Port loadable without constructing the
  // reconciliation persistence adapter. Only cancellation actually needs the
  // provider-observation workflow and its database dependency.
  const { syncRideHailingOrderWithProvider } =
    await import("./use-cases/sync-ride-hailing-order-with-provider");
  await syncRideHailingOrderWithProvider({
    orderId: input.orderId as TradeOrderId,
    trigger: input.purpose === "FEE_PREVIEW" ? "CANCEL_FEE_PREVIEW" : "CANCEL_REQUEST",
  });
}

/**
 * Trade-facing settlement capability. Dynamic loading keeps the persistence
 * adapter and its dependency graph private to RideHailing while preserving
 * the adapter's single transaction and fee-confirmation scheduling order.
 */
export async function settleRideHailingPaymentAndScheduleFeeConfirmation(input: {
  billLineId: string;
  paymentProviderInstanceId: string;
  attemptCount: number;
  settledAt: string;
}): Promise<BillLinePaymentExecutionSettlement> {
  const { createRideHailingReconciliationTransactionPort } =
    await import("./adapters/ride-hailing-reconciliation-transaction");
  return await createRideHailingReconciliationTransactionPort().settlePaymentAndScheduleFeeConfirmation(
    input,
  );
}
