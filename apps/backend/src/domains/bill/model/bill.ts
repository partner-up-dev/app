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
