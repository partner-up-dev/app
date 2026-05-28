import { describe, expect, it } from "vitest";
import type { TradeOrder } from "../model";
import {
  buildRentalBillTargetAmountSeed,
  resolveRentalTerminationPolicy,
} from "./rental-termination-pricing";

function buildRentalOrder(): TradeOrder {
  return {
    id: "order-1",
    family: "RENTAL",
    createdBy: "user-1",
    status: "OPEN",
    participants: [],
    splitRuleSnapshot: {
      type: "RELATIVE",
      shares: [{ userId: "user-1", percentBps: 10_000 }],
    },
    offerSnapshot: {
      offerId: 1,
      termsVersion: 1,
      productType: "RENTAL",
    },
    items: [
      {
        itemId: "item-1",
        spuId: 1,
        spuVersion: 1,
        spuName: "6C",
        skuId: 1,
        skuVersion: 1,
        skuName: "Baking-2P",
        quantity: 1,
        skuFactsSnapshot: { type: "RENTAL", zoneCode: "BAKING" },
        pricingModelSnapshot: { type: "FIXED_TOTAL", amountFen: 2000 },
        cancellationPolicySnapshot: {
          source: {
            skuPolicyId: "policy-1",
            skuPolicyVersion: 1,
            skuId: 1,
          },
          basis: "CUSTOMER_PAID_AMOUNT",
          operatorBufferMinutes: 60,
          tiers: [
            {
              code: "FULL",
              fromMinutesBeforeStart: 1500,
              untilMinutesBeforeStart: null,
              refundPercent: 100,
              requiresOperatorHandling: true,
              visibleLabel: "全额退款",
            },
            {
              code: "HALF",
              fromMinutesBeforeStart: 360,
              untilMinutesBeforeStart: 1500,
              refundPercent: 50,
              requiresOperatorHandling: true,
              visibleLabel: "半额退款",
            },
            {
              code: "NONE",
              fromMinutesBeforeStart: null,
              untilMinutesBeforeStart: 360,
              refundPercent: 0,
              requiresOperatorHandling: true,
              visibleLabel: "不退款",
            },
          ],
        },
      },
    ],
    pricingSnapshot: {
      currency: "CNY",
      itemBreakdowns: [
        {
          itemId: "item-1",
          resolvedAmountFen: 2000,
          explanations: [],
        },
      ],
      orderLevelExplanations: [],
      subtotalFen: 2000,
      totalFen: 2000,
    },
    timeout: {
      unpaidExpiresAt: "2026-05-29T00:00:00.000Z",
      defaultWindowMinutes: 30,
    },
    terminationAttempts: [],
    selectedZoneCodes: ["BAKING"],
    serviceStartAt: "2026-05-30T10:00:00.000Z",
    serviceEndAt: "2026-05-30T13:00:00.000Z",
    participantCount: 2,
    contactPhone: "13800000000",
    registrants: [],
  };
}

describe("rental termination pricing", () => {
  it("derives a full-refund target before the full-refund cutoff", () => {
    const order = buildRentalOrder();
    const result = resolveRentalTerminationPolicy(order, {
      attemptId: "attempt-1",
      requestedAt: "2026-05-29T08:00:00.000Z",
    });

    expect(result.targetChargeTotalFen).toBe(0);
    expect(result.refundDeltaFen).toBe(2000);
    expect(result.selectedTiers[0]?.tier.code).toBe("FULL");
  });

  it("derives a partial-refund target inside the half-refund window", () => {
    const order = buildRentalOrder();
    const result = buildRentalBillTargetAmountSeed({
      order,
      attempt: {
        attemptId: "attempt-1",
        requestedAt: "2026-05-30T01:00:00.000Z",
      },
    });

    expect(result.targetChargeTotalFen).toBe(1000);
  });

  it("derives a no-refund target near start", () => {
    const order = buildRentalOrder();
    const result = resolveRentalTerminationPolicy(order, {
      attemptId: "attempt-1",
      requestedAt: "2026-05-30T06:30:00.000Z",
    });

    expect(result.targetChargeTotalFen).toBe(2000);
    expect(result.selectedTiers[0]?.tier.code).toBe("NONE");
  });
});
