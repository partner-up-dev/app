import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { BillLine } from "../../../entities/bill";
import { deriveBillPaymentState } from "./bill-payment-state";

const chargeLineId = "11111111-1111-4111-8111-111111111111" as BillLine["id"];
const refundLineId = "44444444-4444-4444-8444-444444444444" as BillLine["id"];
const billId = "22222222-2222-4222-8222-222222222222" as BillLine["billId"];
const userId = "33333333-3333-4333-8333-333333333333" as BillLine["userId"];
const paymentProviderInstanceId = "55555555-5555-4555-8555-555555555555" as NonNullable<
  BillLine["paymentProviderInstanceId"]
>;

const buildChargeLine = (overrides: Partial<BillLine> = {}): BillLine => ({
  id: chargeLineId,
  billId,
  userId,
  kind: "CHARGE",
  amountFen: 1200,
  currency: "CNY",
  label: "Charge",
  description: null,
  refundOfBillLineId: null,
  paymentProviderInstanceId: null,
  attemptCount: 0,
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  settledAt: null,
  ...overrides,
});

const buildRefundLine = (overrides: Partial<BillLine> = {}): BillLine => ({
  id: refundLineId,
  billId,
  userId,
  kind: "REFUND",
  amountFen: 300,
  currency: "CNY",
  label: "Refund",
  description: null,
  refundOfBillLineId: chargeLineId,
  paymentProviderInstanceId: null,
  attemptCount: 0,
  createdAt: new Date("2030-01-01T00:00:00.000Z"),
  settledAt: null,
  ...overrides,
});

describe("deriveBillPaymentState", () => {
  it("returns unpaid state for fresh charge lines", () => {
    const line = buildChargeLine();

    const result = deriveBillPaymentState({
      lines: [line],
    });

    assert.equal(result.chargeTotalFen, 1200);
    assert.equal(result.paidChargeFen, 0);
    assert.equal(result.refundTotalFen, 0);
    assert.equal(result.refundedFen, 0);
    assert.equal(result.allChargesPaid, false);
    assert.equal(result.hasPendingPayment, false);
    assert.deepEqual(result.lines, [
      {
        billLineId: line.id,
        status: "UNPAID",
        paidFen: 0,
        refundableFen: 0,
      },
    ]);
  });

  it("returns processing state for open charge execution", () => {
    const line = buildChargeLine({
      paymentProviderInstanceId,
      attemptCount: 1,
    });

    const result = deriveBillPaymentState({
      lines: [line],
    });

    assert.equal(result.hasPendingPayment, true);
    assert.deepEqual(result.lines, [
      {
        billLineId: line.id,
        status: "PROCESSING",
        paidFen: 0,
        refundableFen: 0,
      },
    ]);
  });

  it("treats zero-amount charge lines as paid", () => {
    const line = buildChargeLine({
      amountFen: 0,
    });

    const result = deriveBillPaymentState({
      lines: [line],
    });

    assert.equal(result.chargeTotalFen, 0);
    assert.equal(result.paidChargeFen, 0);
    assert.equal(result.allChargesPaid, true);
    assert.deepEqual(result.lines, [
      {
        billLineId: line.id,
        status: "PAID",
        paidFen: 0,
        refundableFen: 0,
      },
    ]);
  });

  it("returns paid and refunded totals from settled lines", () => {
    const settledAt = new Date("2030-01-01T00:00:00.000Z");
    const charge = buildChargeLine({
      amountFen: 1200,
      settledAt,
    });
    const refund = buildRefundLine({
      amountFen: 300,
      settledAt,
    });

    const result = deriveBillPaymentState({
      lines: [charge, refund],
    });

    assert.equal(result.chargeTotalFen, 1200);
    assert.equal(result.paidChargeFen, 1200);
    assert.equal(result.refundTotalFen, 300);
    assert.equal(result.refundedFen, 300);
    assert.equal(result.allChargesPaid, true);
    assert.equal(result.hasPendingPayment, false);
    assert.deepEqual(result.lines, [
      {
        billLineId: charge.id,
        status: "PAID",
        paidFen: 1200,
        refundableFen: 0,
      },
      {
        billLineId: refund.id,
        status: "REFUNDED",
        paidFen: 0,
        refundableFen: 300,
      },
    ]);
  });
});
