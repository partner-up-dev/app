export type BillStatus = "ACTIVE" | "VOIDED" | "CLOSED";

export type BillLineKind = "CHARGE" | "REFUND";

export type BillLine = {
  id: string;
  userId: string;
  kind: BillLineKind;
  amountFen: number;
  label: string;
  description?: string | null;
  refundOfBillLineId?: string | null;
};

export type BillLineSettlementStatus =
  | "UNPAID"
  | "ACTION_REQUIRED"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type BillLineSettlementProjection = {
  billLineId: string;
  status: BillLineSettlementStatus;
  paidFen: number;
};

/**
 * The persistence-independent facts required to project a BillLine's
 * payment state. Repositories may supply a Drizzle row, but payment rules
 * only depend on this small value shape.
 */
export type BillPaymentStateLineFact = {
  id: string;
  kind: BillLineKind;
  amountFen: number;
  paymentProviderInstanceId: string | null;
  settledAt: Date | null;
};

export type BillLinePaymentProjection = {
  billLineId: string;
  status: BillLineSettlementStatus;
  paidFen: number;
  refundableFen: number;
};

export type BillPaymentState = {
  chargeTotalFen: number;
  paidChargeFen: number;
  refundTotalFen: number;
  refundedFen: number;
  allChargesPaid: boolean;
  hasPendingPayment: boolean;
  lines: BillLinePaymentProjection[];
};

/**
 * Bill's payable rule consumes only the order payment-window facts it needs,
 * rather than a Trade persistence model.
 */
export type BillPayableOrderContext = {
  status: string;
  timeout: {
    unpaidExpiresAt: string;
  };
};

export type UnpaidPayableBillLineCandidate = {
  line: Pick<BillPaymentStateLineFact, "kind" | "amountFen" | "settledAt">;
  bill?: {
    status: BillStatus;
  } | null;
  order?: BillPayableOrderContext | null;
};

export type Bill = {
  id: string;
  status: BillStatus;
  currency: "CNY";
  lines: BillLine[];
};

export type BillSeed = {
  sourceOrderId: string;
  currency: "CNY";
  chargeLines: Array<{
    userId: string;
    amountFen: number;
    label: string;
    description?: string | null;
  }>;
};
