import type { BillLinePaymentExecutionSettlement } from "../bill/contracts";
import type {
  RideHailingDriverSnapshot,
  RideHailingExecutionPhase,
  RideHailingVehicleSnapshot,
} from "../trade/contracts";

/**
 * Provider configuration and outcome vocabulary shared with Trade and admin
 * adapters. It intentionally excludes provider raw payloads and adapter
 * implementation details.
 */
export type {
  CaocaoProviderInstanceConfig,
  RideHailingProviderInstanceStatus,
  RideHailingProviderType,
  RideHailingProviderVehicleQuote,
} from "./model";
export {
  RideHailingProviderCreateOutcomeUnknownError,
  RideHailingProviderCreateRejectedError,
} from "./model";
export { validateRideHailingProviderInstanceConfig } from "./services/provider-config";

/**
 * A provider-detail read failed before its resulting observation could be
 * reconciled. Consumers can map this to an availability failure without
 * learning provider transport details.
 */
export class RideHailingProviderSyncQueryError extends Error {
  constructor(
    message: string,
    readonly originalError: unknown,
  ) {
    super(message);
    this.name = "RideHailingProviderSyncQueryError";
  }
}

/**
 * A durable final fare and its final Bill already exist, but a later
 * authoritative provider fare differs. This is an explicit escalation seam:
 * callers must not silently rewrite settled history.
 */
export type RideHailingFareCorrectionRequired = {
  orderId: string;
  billId: string;
  committedAmountFen: number;
  observedAmountFen: number;
  currency: "CNY";
  providerOrderId: string;
};

/**
 * The only provider binding facts a reconciliation transaction may trust.
 * The transaction must re-check them after acquiring its local locks.
 */
export type RideHailingProviderBindingExpectation = {
  providerInstanceId: string;
  providerOrderId: string;
};

/**
 * Normalized provider facts that can advance a RideHailing execution
 * projection. It deliberately omits the raw provider payload and all local
 * persistence rows.
 */
export type RideHailingProviderObservationForReconciliation = {
  executionPhase: RideHailingExecutionPhase | null;
  driverSnapshot: RideHailingDriverSnapshot | null;
  vehicleSnapshot: RideHailingVehicleSnapshot | null;
  providerVehicleTypeCode: string | null;
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

/**
 * RideHailing owns the short atomic commits that reconcile a provider
 * observation or qualifying BillLine settlement with local Trade/Ride/Bill
 * facts and its causally keyed Job. The Port exposes semantic inputs only:
 * neither provider I/O nor repositories/executors can cross it.
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
  settlePaymentAndScheduleFeeConfirmation(input: {
    billLineId: string;
    paymentProviderInstanceId: string;
    attemptCount: number;
    settledAt: string;
  }): Promise<BillLinePaymentExecutionSettlement>;
};
