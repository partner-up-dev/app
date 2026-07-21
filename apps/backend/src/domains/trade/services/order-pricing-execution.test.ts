import { describe, expect, it } from "vitest";
import type { Offer } from "../../../entities/offer";
import type { ProductSku } from "../../../entities/product-sku";
import type { ProductSpu } from "../../../entities/product-spu";
import type { PricingRule } from "../../merchandising/contracts";
import {
  buildOrderPricingExecutionSnapshot,
  resolvePricingFromExecutionSnapshot,
} from "./order-pricing-execution";

const now = new Date("2026-06-01T00:00:00.000Z");

const ratioRule = (input: { id: number; ratioBps: number }): PricingRule => ({
  id: input.id,
  label: `ratio-${input.id}`,
  description: "ratio policy",
  conditionRule: true,
  action: {
    type: "RATIO",
    payload: {
      ratioBps: input.ratioBps,
    },
  },
  target: {
    level: "ORDER",
  },
  continue: true,
});

const buildOffer = (rules: PricingRule[]): Offer => ({
  id: 100,
  status: "ACTIVE",
  productType: "RIDE_HAILING",
  spuIds: [1],
  pricingPolicy: {
    rules,
  },
  termsVersion: 1,
  startsAt: null,
  endsAt: null,
  createdAt: now,
  updatedAt: now,
});

const buildSpu = (): ProductSpu => ({
  id: 1,
  version: 1,
  status: "ACTIVE",
  name: "Ride hailing",
  productType: "RIDE_HAILING",
  salesPolicy: {
    skuSelectionPolicy: {
      type: "CHOICE_SET",
      min: 1,
      max: null,
      resolvesTo: 1,
    },
    quantityPolicy: {
      type: "FIXED",
      quantity: 1,
    },
  },
  servicePolicy: {
    type: "RIDE_HAILING",
  },
  presentation: {
    heroImageAssetIds: [],
    detailImageAssetIds: [],
    sellingPoints: [],
    parameterGroups: [],
    noticeBlocks: [],
  },
  facts: {
    provider: "CAOCAO",
  },
  createdAt: now,
  updatedAt: now,
});

const buildSku = (): ProductSku => ({
  id: 10,
  spuId: 1,
  version: 1,
  status: "ACTIVE",
  name: "Express",
  sortOrder: 1,
  presentation: {
    heroImageAssetIds: [],
    detailImageAssetIds: [],
    sellingPoints: [],
    parameterGroups: [],
    noticeBlocks: [],
  },
  facts: {
    rideHailingProviderInstanceId: "provider-1",
    providerVehicleTypeCode: "3",
  },
  pricingModel: {
    type: "DYNAMIC_QUOTE",
    calculatorSpec: {
      version: 1,
      currency: "CNY",
      components: [],
    },
  },
  cancellationPolicyRef: null,
  createdAt: now,
  updatedAt: now,
});

describe("order pricing execution snapshot", () => {
  it("prices runtime dynamic quote input through the locked offer policy", () => {
    const offerAtCreate = buildOffer([ratioRule({ id: 1, ratioBps: 5000 })]);
    const snapshot = buildOrderPricingExecutionSnapshot({
      offer: offerAtCreate,
      items: [
        {
          itemId: "ride-item",
          spu: buildSpu(),
          sku: buildSku(),
          quantity: 1,
        },
      ],
    });

    offerAtCreate.pricingPolicy = {
      rules: [ratioRule({ id: 2, ratioBps: 1000 })],
    };

    const pricing = resolvePricingFromExecutionSnapshot({
      snapshot,
      orderContext: {
        quoteTotalFen: 5000,
      },
    });

    expect(pricing.totalFen).toBe(2500);
    expect(pricing.orderLevelExplanations[0]?.sourceId).toBe("rule:OFFER_POLICY:ORDER:1");
  });
});
