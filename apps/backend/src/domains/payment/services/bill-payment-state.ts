import type { BillLine, BillLineId } from "../../../entities/bill";

export type BillLineSettlementStatus =
  | "UNPAID"
  | "ACTION_REQUIRED"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type BillLinePaymentProjection = {
  billLineId: BillLineId;
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

const toLinePaymentProjection = (line: BillLine): BillLinePaymentProjection => {
  if (line.kind === "REFUND") {
    const refundedFen = line.settledAt ? line.amountFen : 0;
    return {
      billLineId: line.id,
      status:
        line.settledAt
          ? "REFUNDED"
          : line.paymentProviderInstanceId
            ? "REFUND_PENDING"
            : "UNPAID",
      paidFen: 0,
      refundableFen: refundedFen,
    };
  }

  const paidFen = line.settledAt ? line.amountFen : 0;
  const status: BillLineSettlementStatus =
    line.settledAt
      ? "PAID"
      : line.paymentProviderInstanceId
        ? "PROCESSING"
        : "UNPAID";

  return {
    billLineId: line.id,
    status,
    paidFen,
    refundableFen: 0,
  };
};

export function deriveBillPaymentState(input: {
  lines: BillLine[];
}): BillPaymentState {
  const projections = input.lines.map((line) => toLinePaymentProjection(line));
  const projectionByLineId = new Map(
    projections.map((projection) => [projection.billLineId, projection]),
  );
  const chargeLines = input.lines.filter((line) => line.kind === "CHARGE");
  const refundLines = input.lines.filter((line) => line.kind === "REFUND");
  const chargeTotalFen = chargeLines.reduce((sum, line) => sum + line.amountFen, 0);
  const refundTotalFen = refundLines.reduce((sum, line) => sum + line.amountFen, 0);
  const paidChargeFen = chargeLines.reduce(
    (sum, line) => sum + (projectionByLineId.get(line.id)?.paidFen ?? 0),
    0,
  );
  const refundedFen = refundLines.reduce(
    (sum, line) => sum + (projectionByLineId.get(line.id)?.refundableFen ?? 0),
    0,
  );

  return {
    chargeTotalFen,
    paidChargeFen,
    refundTotalFen,
    refundedFen,
    allChargesPaid:
      chargeLines.length > 0 &&
      chargeLines.every(
        (line) => (projectionByLineId.get(line.id)?.paidFen ?? 0) >= line.amountFen,
      ),
    hasPendingPayment: projections.some((projection) =>
      ["ACTION_REQUIRED", "PROCESSING", "REFUND_PENDING"].includes(
        projection.status,
      ),
    ),
    lines: projections,
  };
}
