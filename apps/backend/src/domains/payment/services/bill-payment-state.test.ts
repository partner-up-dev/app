import { describe, expect, it } from "vitest";
import type { BillId, BillLine, BillLineId } from "../../../entities/bill";
import type {
  PaymentProviderInstanceId,
  PaymentTx,
  PaymentTxId,
} from "../../../entities/payment";
import type { UserId } from "../../../entities/user";
import { deriveBillPaymentState } from "./bill-payment-state";

const billId = "00000000-0000-0000-0000-000000000001" as BillId;
const providerInstanceId =
  "00000000-0000-0000-0000-000000000010" as PaymentProviderInstanceId;
const userA = "00000000-0000-0000-0000-000000000101" as UserId;
const userB = "00000000-0000-0000-0000-000000000102" as UserId;
const now = new Date("2031-01-01T00:00:00.000Z");

const billLine = (input: {
  id: string;
  userId: UserId;
  kind: BillLine["kind"];
  amountFen: number;
  sourceLineId?: BillLineId | null;
}): BillLine => ({
  id: input.id as BillLineId,
  billId,
  userId: input.userId,
  kind: input.kind,
  amountFen: input.amountFen,
  currency: "CNY",
  label: input.kind,
  description: null,
  sourceLineId: input.sourceLineId ?? null,
  createdAt: now,
});

const paymentTx = (input: {
  id: string;
  billLineId: BillLineId;
  type: PaymentTx["type"];
  status: PaymentTx["status"];
  amountFen: number;
}): PaymentTx => ({
  id: input.id as PaymentTxId,
  billId,
  billLineId: input.billLineId,
  type: input.type,
  providerInstanceId,
  clientId: "web",
  sourcePaymentTxId: null,
  status: input.status,
  amountFen: input.amountFen,
  currency: "CNY",
  requestedBy: userA,
  merchantOrderNo: input.type === "CHARGE" ? `order-${input.id}` : null,
  merchantRefundNo: input.type === "REFUND" ? `refund-${input.id}` : null,
  providerPrepayId: null,
  providerTransactionId: null,
  providerRefundId: null,
  providerStatus: null,
  clientAction: null,
  providerSnapshot: null,
  failureCode: null,
  failureMessage: null,
  expiresAt: null,
  succeededAt: input.status === "SUCCEEDED" ? now : null,
  closedAt: input.status === "CLOSED" ? now : null,
  createdAt: now,
  updatedAt: now,
});

describe("deriveBillPaymentState", () => {
  it("derives partial settlement from successful charge PaymentTx rows", () => {
    const creatorLine = billLine({
      id: "00000000-0000-0000-0000-000000000201",
      userId: userA,
      kind: "CHARGE",
      amountFen: 1000,
    });
    const joinerLine = billLine({
      id: "00000000-0000-0000-0000-000000000202",
      userId: userB,
      kind: "CHARGE",
      amountFen: 1000,
    });

    const result = deriveBillPaymentState({
      lines: [creatorLine, joinerLine],
      txs: [
        paymentTx({
          id: "00000000-0000-0000-0000-000000000301",
          billLineId: creatorLine.id,
          type: "CHARGE",
          status: "SUCCEEDED",
          amountFen: 1000,
        }),
      ],
    });

    expect(result.chargeTotalFen).toBe(2000);
    expect(result.paidChargeFen).toBe(1000);
    expect(result.allChargesPaid).toBe(false);
    expect(result.lines.map((line) => line.status)).toEqual(["PAID", "UNPAID"]);
  });

  it("derives refunded state from refund PaymentTx rows on refund BillLines", () => {
    const chargeLine = billLine({
      id: "00000000-0000-0000-0000-000000000211",
      userId: userA,
      kind: "CHARGE",
      amountFen: 1000,
    });
    const refundLine = billLine({
      id: "00000000-0000-0000-0000-000000000212",
      userId: userA,
      kind: "REFUND",
      amountFen: 1000,
      sourceLineId: chargeLine.id,
    });

    const result = deriveBillPaymentState({
      lines: [chargeLine, refundLine],
      txs: [
        paymentTx({
          id: "00000000-0000-0000-0000-000000000311",
          billLineId: chargeLine.id,
          type: "CHARGE",
          status: "SUCCEEDED",
          amountFen: 1000,
        }),
        paymentTx({
          id: "00000000-0000-0000-0000-000000000312",
          billLineId: refundLine.id,
          type: "REFUND",
          status: "SUCCEEDED",
          amountFen: 1000,
        }),
      ],
    });

    expect(result.refundTotalFen).toBe(1000);
    expect(result.refundedFen).toBe(1000);
    expect(result.lines.find((line) => line.billLineId === refundLine.id)?.status).toBe(
      "REFUNDED",
    );
  });

  it("marks active charge and refund PaymentTx rows as pending", () => {
    const chargeLine = billLine({
      id: "00000000-0000-0000-0000-000000000221",
      userId: userA,
      kind: "CHARGE",
      amountFen: 1000,
    });
    const refundLine = billLine({
      id: "00000000-0000-0000-0000-000000000222",
      userId: userA,
      kind: "REFUND",
      amountFen: 500,
      sourceLineId: chargeLine.id,
    });

    const result = deriveBillPaymentState({
      lines: [chargeLine, refundLine],
      txs: [
        paymentTx({
          id: "00000000-0000-0000-0000-000000000321",
          billLineId: chargeLine.id,
          type: "CHARGE",
          status: "ACTION_REQUIRED",
          amountFen: 1000,
        }),
        paymentTx({
          id: "00000000-0000-0000-0000-000000000322",
          billLineId: refundLine.id,
          type: "REFUND",
          status: "PROCESSING",
          amountFen: 500,
        }),
      ],
    });

    expect(result.hasPendingPayment).toBe(true);
    expect(result.lines.map((line) => line.status)).toEqual([
      "ACTION_REQUIRED",
      "REFUND_PENDING",
    ]);
  });
});
