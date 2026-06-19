import { describe, expect, it } from "vitest";
import type { BillId, BillLine, BillLineId } from "../../../entities/bill";
import type { PaymentProviderInstanceId } from "../../../entities/payment";
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
  refundOfBillLineId?: BillLineId | null;
  paymentProviderInstanceId?: PaymentProviderInstanceId | null;
  attemptCount?: number;
  settledAt?: Date | null;
}): BillLine => ({
  id: input.id as BillLineId,
  billId,
  userId: input.userId,
  kind: input.kind,
  amountFen: input.amountFen,
  currency: "CNY",
  label: input.kind,
  description: null,
  refundOfBillLineId: input.refundOfBillLineId ?? null,
  paymentProviderInstanceId: input.paymentProviderInstanceId ?? null,
  attemptCount: input.attemptCount ?? 0,
  settledAt: input.settledAt ?? null,
  createdAt: now,
});

describe("deriveBillPaymentState", () => {
  it("derives partial settlement from settled charge BillLines", () => {
    const creatorLine = billLine({
      id: "00000000-0000-0000-0000-000000000201",
      userId: userA,
      kind: "CHARGE",
      amountFen: 1000,
      settledAt: now,
      paymentProviderInstanceId: providerInstanceId,
      attemptCount: 1,
    });
    const joinerLine = billLine({
      id: "00000000-0000-0000-0000-000000000202",
      userId: userB,
      kind: "CHARGE",
      amountFen: 1000,
    });

    const result = deriveBillPaymentState({
      lines: [creatorLine, joinerLine],
    });

    expect(result.chargeTotalFen).toBe(2000);
    expect(result.paidChargeFen).toBe(1000);
    expect(result.allChargesPaid).toBe(false);
    expect(result.lines.map((line) => line.status)).toEqual(["PAID", "UNPAID"]);
  });

  it("derives refunded state from settled refund BillLines", () => {
    const chargeLine = billLine({
      id: "00000000-0000-0000-0000-000000000211",
      userId: userA,
      kind: "CHARGE",
      amountFen: 1000,
      settledAt: now,
      paymentProviderInstanceId: providerInstanceId,
      attemptCount: 1,
    });
    const refundLine = billLine({
      id: "00000000-0000-0000-0000-000000000212",
      userId: userA,
      kind: "REFUND",
      amountFen: 1000,
      refundOfBillLineId: chargeLine.id,
      settledAt: now,
      paymentProviderInstanceId: providerInstanceId,
      attemptCount: 1,
    });

    const result = deriveBillPaymentState({
      lines: [chargeLine, refundLine],
    });

    expect(result.refundTotalFen).toBe(1000);
    expect(result.refundedFen).toBe(1000);
    expect(result.lines.find((line) => line.billLineId === refundLine.id)?.status).toBe(
      "REFUNDED",
    );
  });

  it("marks active charge and refund provider bindings as pending", () => {
    const chargeLine = billLine({
      id: "00000000-0000-0000-0000-000000000221",
      userId: userA,
      kind: "CHARGE",
      amountFen: 1000,
      paymentProviderInstanceId: providerInstanceId,
      attemptCount: 1,
    });
    const refundLine = billLine({
      id: "00000000-0000-0000-0000-000000000222",
      userId: userA,
      kind: "REFUND",
      amountFen: 500,
      refundOfBillLineId: chargeLine.id,
      paymentProviderInstanceId: providerInstanceId,
      attemptCount: 1,
    });

    const result = deriveBillPaymentState({
      lines: [chargeLine, refundLine],
    });

    expect(result.hasPendingPayment).toBe(true);
    expect(result.lines.map((line) => line.status)).toEqual([
      "PROCESSING",
      "REFUND_PENDING",
    ]);
  });
});
