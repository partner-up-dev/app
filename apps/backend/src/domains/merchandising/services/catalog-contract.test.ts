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
      }),
    ).not.toThrow();
  });

  it("rejects SPU service policy mismatches", () => {
    expect(() =>
      assertProductSpuContract({
        productType: "RENTAL",
        servicePolicy: {
          type: "RIDE_HAILING",
        },
      }),
    ).toThrow("SPU productType must match servicePolicy.type");
  });

  it("rejects SKU facts that do not match SPU product type", () => {
    expect(() =>
      assertProductSkuContract({
        spu: { productType: "RENTAL" },
        facts: {
          rideHailingProviderInstanceId: "caocao-main",
          providerVehicleTypeCode: "EXPRESS",
        },
      }),
    ).toThrow("Rental SKU facts must match SPU productType");
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
