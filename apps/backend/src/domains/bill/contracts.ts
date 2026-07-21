import type { TradeOrderBillingContext } from "../trade/contracts";
import type { BillLineKind, BillLineSettlementStatus } from "./model";

/**
 * Bill-owned execution state that Payment may observe or transition. This is
 * a stable value projection, not a BillLine persistence row.
 */
export type BillLinePaymentExecutionSnapshot = {
  id: string;
  billId: string;
  userId: string;
  kind: BillLineKind;
  amountFen: number;
  currency: "CNY";
  label: string;
  description: string | null;
  paymentProviderInstanceId: string | null;
  attemptCount: number;
  settledAt: Date | null;
};

export type BillLinePaymentExecutionClaim =
  | {
      status: "OPENED" | "RESUMED";
      line: BillLinePaymentExecutionSnapshot;
    }
  | {
      status: "SETTLED" | "BOUND_TO_ANOTHER_PROVIDER";
      line: BillLinePaymentExecutionSnapshot;
    };

export type BillLinePaymentExecutionSettlement = {
  status: "SETTLED" | "ALREADY_SETTLED" | "STALE";
  line: BillLinePaymentExecutionSnapshot;
};

export type BillLineCheckoutTargetProjection = {
  bill: {
    id: string;
    sourceOrderId: string;
    status: string;
    currency: "CNY";
  };
  order: TradeOrderBillingContext;
  line: {
    id: string;
    billId: string;
    userId: string;
    kind: BillLineKind;
    amountFen: number;
    currency: "CNY";
    label: string;
    description: string | null;
    settlementStatus: BillLineSettlementStatus;
    paymentProviderInstanceId: string | null;
    attemptCount: number;
    settledAt: string | null;
  };
  eligibility: {
    payable: boolean;
    disabledReason: string | null;
  };
};

/**
 * Stable allocation vocabulary used when another owner supplies a durable
 * amount but Bill still owns the deterministic split into charge lines.
 */
export { materializeChargeLinesFromSplitRule } from "./services/materialize-charge-lines";
export type { BillChargeLineSeed } from "./services/materialize-charge-lines";
