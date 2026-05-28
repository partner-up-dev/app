import { describe, expect, it } from "vitest";
import {
  assertOfferMatchesSpus,
  assertProductSkuContract,
  assertProductSpuContract,
  assertSkuPolicyBinding,
} from "./catalog-contract";

describe("catalog contract guards", () => {
  it("accepts aligned SPU contracts", () => {
    expect(() =>
      assertProductSpuContract({
        productType: "RENTAL",
        servicePolicy: {
          type: "RENTAL",
          bookingLeadTimeMinutes: 1440,
          requiresContactPhone: true,
          requiresRealName: true,
          requiresNationalId: false,
        },
        pricingRules: [
          {
            id: 1,
            label: "minus",
            description: "minus",
            conditionRule: null,
            action: { type: "MINUS", payload: { amountFen: 100 } },
            target: { level: "SKU" },
            continue: false,
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects SPU pricing rules that target non-SKU levels", () => {
    expect(() =>
      assertProductSpuContract({
        productType: "RENTAL",
        servicePolicy: {
          type: "RENTAL",
          bookingLeadTimeMinutes: 1440,
          requiresContactPhone: true,
          requiresRealName: true,
          requiresNationalId: false,
        },
        pricingRules: [
          {
            id: 1,
            label: "bad",
            description: "bad",
            conditionRule: null,
            action: { type: "MINUS", payload: { amountFen: 100 } },
            target: { level: "ORDER" },
            continue: false,
          },
        ],
      }),
    ).toThrow("SPU pricing policy may target SKU only");
  });

  it("rejects SKU facts that do not match SPU product type", () => {
    expect(() =>
      assertProductSkuContract({
        spu: { productType: "RENTAL" },
        facts: { type: "RIDE_HAILING", vehicleClass: "STANDARD" },
      }),
    ).toThrow("SKU facts type must match SPU productType");
  });

  it("rejects mixed product types inside one offer", () => {
    expect(() =>
      assertOfferMatchesSpus({
        productType: "RENTAL",
        spus: [
          { id: 1, productType: "RENTAL" },
          { id: 2, productType: "RIDE_HAILING" },
        ],
      }),
    ).toThrow("Offer productType must match every referenced SPU");
  });

  it("rejects cancellation policies bound to another SKU", () => {
    expect(() =>
      assertSkuPolicyBinding({
        sku: { id: 1, spuId: 1 },
        referencedSkuId: 2,
      }),
    ).toThrow("Cancellation policy must bind to the referenced SKU");
  });
});
