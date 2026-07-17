import { describe, expect, it } from "vitest";
import { deriveBillReconcilePlan } from "./reconcile-lines";
import type { BillLine, BillLineSettlementProjection } from "../model";

describe("deriveBillReconcilePlan", () => {
  const baseLines: BillLine[] = [
    {
      id: "line-1",
      userId: "u1",
      kind: "CHARGE" as const,
      amountFen: 1200,
      label: "charge-1",
    },
    {
      id: "line-2",
      userId: "u2",
      kind: "CHARGE" as const,
      amountFen: 800,
      label: "charge-2",
    },
  ];
  const paidSettlements = (
    lines: BillLine[],
    overrides: Record<string, number> = {},
  ): BillLineSettlementProjection[] =>
    lines.map((line) => {
      const paidFen = line.kind === "CHARGE" ? (overrides[line.id] ?? line.amountFen) : 0;
      return {
        billLineId: line.id,
        status: paidFen >= line.amountFen ? "PAID" : paidFen > 0 ? "PROCESSING" : "UNPAID",
        paidFen,
      };
    });

  it("creates a refund plan when target total is lower than the current effective total", () => {
    const result = deriveBillReconcilePlan({
      lines: baseLines,
      targetChargeTotalFen: 800,
      lineSettlements: paidSettlements(baseLines),
    });

    expect(result).toEqual({
      direction: "REFUND",
      deltaFen: 1200,
      allocations: [
        { userId: "u1", amountFen: 720, refundOfBillLineId: "line-1" },
        { userId: "u2", amountFen: 480, refundOfBillLineId: "line-2" },
      ],
    });
  });

  it("does not create refund allocations for unpaid charge lines", () => {
    const result = deriveBillReconcilePlan({
      lines: baseLines,
      targetChargeTotalFen: 0,
      lineSettlements: paidSettlements(baseLines, {
        "line-1": 0,
        "line-2": 0,
      }),
    });

    expect(result).toEqual({
      direction: "NONE",
      deltaFen: 0,
      allocations: [],
    });
  });

  it("bounds refund allocations by paid charge BillLine basis", () => {
    const result = deriveBillReconcilePlan({
      lines: baseLines,
      targetChargeTotalFen: 0,
      lineSettlements: paidSettlements(baseLines, {
        "line-1": 1200,
        "line-2": 0,
      }),
    });

    expect(result).toEqual({
      direction: "REFUND",
      deltaFen: 1200,
      allocations: [{ userId: "u1", amountFen: 1200, refundOfBillLineId: "line-1" }],
    });
  });

  it("creates an extra-charge plan when target total is higher than the current effective total", () => {
    const result = deriveBillReconcilePlan({
      lines: baseLines,
      targetChargeTotalFen: 2600,
      lineSettlements: paidSettlements(baseLines),
    });

    expect(result).toEqual({
      direction: "CHARGE",
      deltaFen: 600,
      allocations: [
        { userId: "u1", amountFen: 360 },
        { userId: "u2", amountFen: 240 },
      ],
    });
  });

  it("uses the effective total after prior refunds", () => {
    const result = deriveBillReconcilePlan({
      lines: [
        ...baseLines,
        {
          id: "line-3",
          userId: "u1",
          kind: "REFUND" as const,
          amountFen: 200,
          label: "refund-1",
          refundOfBillLineId: "line-1",
        },
      ],
      targetChargeTotalFen: 1500,
      lineSettlements: paidSettlements(baseLines),
    });

    expect(result).toEqual({
      direction: "REFUND",
      deltaFen: 300,
      allocations: [
        { userId: "u1", amountFen: 167, refundOfBillLineId: "line-1" },
        { userId: "u2", amountFen: 133, refundOfBillLineId: "line-2" },
      ],
    });
  });
});
