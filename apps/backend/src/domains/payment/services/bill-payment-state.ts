import type { BillLine, BillLineId } from "../../../entities/bill";
import type { PaymentTx } from "../../../entities/payment";

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
  latestPaymentTxId: string | null;
  activePaymentTxId: string | null;
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

const activeStatuses = new Set(["INITIATED", "ACTION_REQUIRED", "PROCESSING"]);

const toLinePaymentProjection = (
  line: BillLine,
  txs: PaymentTx[],
): BillLinePaymentProjection => {
  const lineTxs = txs.filter((tx) => tx.billLineId === line.id);
  const successful = lineTxs.filter((tx) => tx.status === "SUCCEEDED");
  const active = lineTxs.find((tx) => activeStatuses.has(tx.status)) ?? null;
  const latest = lineTxs[0] ?? null;
  const paidFen = successful
    .filter((tx) => tx.direction === "CHARGE")
    .reduce((sum, tx) => sum + tx.amountFen, 0);
  const refundedFen = successful
    .filter((tx) => tx.direction === "REFUND")
    .reduce((sum, tx) => sum + tx.amountFen, 0);

  if (line.kind === "REFUND") {
    return {
      billLineId: line.id,
      status:
        refundedFen >= line.amountFen
          ? "REFUNDED"
          : active
            ? "REFUND_PENDING"
            : "UNPAID",
      paidFen: 0,
      refundableFen: refundedFen,
      latestPaymentTxId: latest?.id ?? null,
      activePaymentTxId: active?.id ?? null,
    };
  }

  const status: BillLineSettlementStatus =
    paidFen >= line.amountFen
      ? "PAID"
      : active
        ? active.status === "ACTION_REQUIRED"
          ? "ACTION_REQUIRED"
          : "PROCESSING"
        : latest?.status === "FAILED" || latest?.status === "CLOSED"
          ? "FAILED"
          : "UNPAID";

  return {
    billLineId: line.id,
    status,
    paidFen,
    refundableFen: 0,
    latestPaymentTxId: latest?.id ?? null,
    activePaymentTxId: active?.id ?? null,
  };
};

export function deriveBillPaymentState(input: {
  lines: BillLine[];
  txs: PaymentTx[];
}): BillPaymentState {
  const projections = input.lines.map((line) =>
    toLinePaymentProjection(line, input.txs),
  );
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
