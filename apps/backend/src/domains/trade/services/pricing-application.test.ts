import { describe, expect, it } from "vitest";
import type { Offer } from "../../../entities/offer";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { PricingRule } from "../../merchandising";
import { PricingApplication } from "./pricing-application";

const now = new Date("2026-05-31T00:00:00.000Z");

function buildSpu(overrides: Partial<ProductSpu> = {}): ProductSpu {
  return {
    id: 1,
    version: 1,
    status: "ACTIVE",
    name: "6C DIY kitchen",
    productType: "RENTAL",
    salesPolicy: {
      skuSelectionPolicy: {
        type: "EXACTLY_ONE",
      },
      quantityPolicy: {
        type: "FIXED",
        quantity: 1,
      },
    },
    servicePolicy: {
      type: "RENTAL",
      bookingLeadTimeMinutes: 1440,
      requiresContactPhone: true,
      requiresRealName: true,
      requiresNationalId: false,
    },
    presentation: {
      heroImageAssetIds: [],
      detailImageAssetIds: [],
      sellingPoints: [],
      parameterGroups: [],
      noticeBlocks: [],
    },
    facts: {
      supplier: "6C",
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildSku(overrides: Partial<ProductSku> = {}): ProductSku {
  return {
    id: 10,
    spuId: 1,
    version: 1,
    status: "ACTIVE",
    name: "Baking zone",
    sortOrder: 0,
    presentation: {
      heroImageAssetIds: [],
      detailImageAssetIds: [],
      sellingPoints: [],
      parameterGroups: [],
      noticeBlocks: [],
    },
    facts: {
      type: "RENTAL",
      zoneCode: "BAKING",
      participantCount: 2,
      durationMinutes: 180,
    },
    pricingModel: {
      type: "FIXED_TOTAL",
      amountFen: 6000,
    },
    cancellationPolicyRef: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 100,
    status: "ACTIVE",
    productType: "RENTAL",
    spuIds: [1],
    pricingPolicy: {
      rules: [],
    },
    termsVersion: 1,
    startsAt: null,
    endsAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function minusRule(input: {
  id: number;
  target: PricingRule["target"];
  amountFen: number;
  conditionRule?: unknown;
  continue?: boolean;
}): PricingRule {
  return {
    id: input.id,
    label: `minus-${input.id}`,
    description: "discount",
    conditionRule: input.conditionRule ?? true,
    action: {
      type: "MINUS",
      payload: {
        amountFen: input.amountFen,
      },
    },
    target: input.target,
    continue: input.continue ?? true,
  };
}

function ratioRule(input: {
  id: number;
  target: PricingRule["target"];
  ratioBps: number;
  conditionRule?: unknown;
  continue?: boolean;
}): PricingRule {
  return {
    id: input.id,
    label: `ratio-${input.id}`,
    description: "ratio discount",
    conditionRule: input.conditionRule ?? true,
    action: {
      type: "RATIO",
      payload: {
        ratioBps: input.ratioBps,
      },
    },
    target: input.target,
    continue: input.continue ?? true,
  };
}

describe("PricingApplication", () => {
  const app = new PricingApplication();

  it("returns SKU base pricing and explanation", () => {
    const result = app.resolve({
      offer: buildOffer(),
      items: [
        {
          itemId: "item-1",
          spu: buildSpu(),
          sku: buildSku(),
          quantity: 1,
        },
      ],
    });

    expect(result.totalFen).toBe(6000);
    expect(result.itemBreakdowns[0]?.explanations).toEqual([
      {
        phase: "SKU_BASE",
        sourceType: "PRICING_MODEL",
        sourceId: "sku:10",
        label: "Baking zone",
        description: "固定总价",
        deltaFen: 6000,
        resultAmountFen: 6000,
      },
    ]);
  });

  it("applies Offer rules over SKU base amount", () => {
    const spu = buildSpu();
    const offer = buildOffer({
      pricingPolicy: {
        rules: [
          ratioRule({
            id: 2,
            target: {
              level: "SKU",
              skuId: 10,
            },
            ratioBps: 8000,
          }),
        ],
      },
    });

    const result = app.resolve({
      offer,
      items: [
        {
          itemId: "item-1",
          spu,
          sku: buildSku(),
          quantity: 1,
        },
      ],
    });

    expect(result.totalFen).toBe(4800);
    expect(result.itemBreakdowns[0]?.explanations.map((item) => item.phase)).toEqual([
      "SKU_BASE",
      "OFFER_POLICY",
    ]);
  });

  it("applies Offer SPU and ORDER target rules", () => {
    const result = app.resolve({
      offer: buildOffer({
        pricingPolicy: {
          rules: [
            minusRule({
              id: 1,
              target: {
                level: "SPU",
                spuId: 1,
              },
              amountFen: 1000,
            }),
            minusRule({
              id: 2,
              target: {
                level: "ORDER",
              },
              amountFen: 500,
            }),
          ],
        },
      }),
      items: [
        {
          itemId: "item-1",
          spu: buildSpu(),
          sku: buildSku(),
          quantity: 1,
        },
      ],
    });

    expect(result.subtotalFen).toBe(5000);
    expect(result.totalFen).toBe(4500);
    expect(result.orderLevelExplanations).toHaveLength(1);
  });

  it("evaluates rule conditions against target data", () => {
    const result = app.resolve({
      offer: buildOffer({
        pricingPolicy: {
          rules: [
            minusRule({
              id: 1,
              target: {
                level: "SKU",
              },
              amountFen: 1000,
              conditionRule: {
                "===": [{ var: "sku.facts.zoneCode" }, "BAKING"],
              },
            }),
            minusRule({
              id: 2,
              target: {
                level: "SKU",
              },
              amountFen: 1000,
              conditionRule: {
                "===": [{ var: "sku.facts.zoneCode" }, "CHINESE_COOKING"],
              },
            }),
          ],
        },
      }),
      items: [
        {
          itemId: "item-1",
          spu: buildSpu(),
          sku: buildSku(),
          quantity: 1,
        },
      ],
    });

    expect(result.totalFen).toBe(5000);
    expect(result.itemBreakdowns[0]?.explanations).toHaveLength(2);
  });

  it("stops later rules for the same target when continue is false", () => {
    const result = app.resolve({
      offer: buildOffer({
        pricingPolicy: {
          rules: [
            minusRule({
              id: 1,
              target: {
                level: "SKU",
              },
              amountFen: 1000,
              continue: false,
            }),
            minusRule({
              id: 2,
              target: {
                level: "SKU",
              },
              amountFen: 1000,
            }),
          ],
        },
      }),
      items: [
        {
          itemId: "item-1",
          spu: buildSpu(),
          sku: buildSku(),
          quantity: 1,
        },
      ],
    });

    expect(result.totalFen).toBe(5000);
    expect(result.itemBreakdowns[0]?.explanations).toHaveLength(2);
  });
});
