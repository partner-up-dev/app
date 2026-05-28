import { describe, expect, it } from "vitest";
import { deriveBillReconcilePlan } from "./reconcile-lines";

describe("deriveBillReconcilePlan", () => {
  const baseLines = [
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

  it("creates a refund plan when target total is lower than the current effective total", () => {
    const result = deriveBillReconcilePlan({
      lines: baseLines,
      targetChargeTotalFen: 800,
    });

    expect(result).toEqual({
      direction: "REFUND",
      deltaFen: 1200,
      allocations: [
        { userId: "u1", amountFen: 720 },
        { userId: "u2", amountFen: 480 },
      ],
    });
  });

  it("creates an extra-charge plan when target total is higher than the current effective total", () => {
    const result = deriveBillReconcilePlan({
      lines: baseLines,
      targetChargeTotalFen: 2600,
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
        },
      ],
      targetChargeTotalFen: 1500,
    });

    expect(result).toEqual({
      direction: "REFUND",
      deltaFen: 300,
      allocations: [
        { userId: "u1", amountFen: 180 },
        { userId: "u2", amountFen: 120 },
      ],
    });
  });
});
