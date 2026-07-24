import { describe, expect, it } from "vitest";
import {
  toOfferCreateBody,
  toOfferUpdateBody,
  toProductSkuCreateBody,
  toProductSkuUpdateBody,
  toProductSpuCreateBody,
  toProductSpuUpdateBody,
  toSkuCancellationPolicyBody,
} from "@/domains/admin-commerce/adapters/adminCommerceRpcAdapter";
import type { OfferValue } from "@/domains/admin-commerce/model/pricing-rules/offerValues";
import type {
  ProductPresentationValue,
  ProductSkuValue,
  ProductSpuValue,
  SkuCancellationPolicyValue,
} from "@/domains/admin-commerce/model/product-management/productValues";

const presentation: ProductPresentationValue = {
  heroImageAssetIds: ["hero"],
  detailImageAssetIds: ["detail"],
  sellingPoints: ["selling point"],
  parameterGroups: [
    {
      title: "参数",
      items: [{ label: "人数", value: "2" }],
    },
  ],
  noticeBlocks: [{ title: "须知", content: "准时到场" }],
};

describe("admin commerce RPC adapter request bodies", () => {
  it("keeps SPU create and update bodies in parity with the semantic value", () => {
    const value: ProductSpuValue = {
      name: "双人皮划艇",
      productType: "RENTAL",
      status: "ACTIVE",
      salesPolicy: {
        skuSelectionPolicy: {
          type: "CHOICE_SET",
          min: 1,
          max: null,
          resolvesTo: 1,
        },
        quantityPolicy: {
          type: "USER_SELECTED",
          min: 1,
          max: 4,
        },
      },
      servicePolicy: {
        type: "RENTAL",
        bookingLeadTimeMinutes: 60,
        serviceWindow: {
          weekdays: [1, 6],
          startTime: "09:00",
          endTime: "18:00",
        },
        requiresContactPhone: true,
        requiresRealName: false,
        requiresNationalId: false,
      },
      presentation,
      facts: { refundableDepositFen: 20_000 },
    };

    expect(toProductSpuCreateBody(value)).toEqual(value);
    expect(toProductSpuUpdateBody(value)).toEqual(value);
  });

  it("adds only the SPU relation to a create SKU body and preserves nullable policy refs", () => {
    const value: ProductSkuValue = {
      name: "三小时",
      status: "DRAFT",
      sortOrder: 2,
      presentation,
      facts: {
        type: "RENTAL",
        zoneCode: "WEST_LAKE",
        participantCount: 2,
        durationMinutes: 180,
      },
      pricingModel: {
        type: "FIXED_TOTAL",
        amountFen: 12_800,
      },
      cancellationPolicyRef: null,
    };

    expect(toProductSkuCreateBody(42, value)).toEqual({
      spuId: 42,
      ...value,
    });
    expect(toProductSkuUpdateBody(value)).toEqual(value);
  });

  it("never leaks persisted cancellation policy identity into the save body", () => {
    const value = {
      policyId: "persisted-policy",
      policyVersion: 7,
      operatorBufferMinutes: 30,
      tiers: [
        {
          code: "DEFAULT",
          fromMinutesBeforeStart: null,
          untilMinutesBeforeStart: 60,
          refundPercent: 100,
          requiresOperatorHandling: false,
          visibleLabel: "全额退款",
        },
      ],
    } satisfies SkuCancellationPolicyValue & {
      policyId: string;
      policyVersion: number;
    };

    expect(toSkuCancellationPolicyBody(value)).toEqual({
      operatorBufferMinutes: 30,
      tiers: value.tiers,
    });
  });

  it("keeps Offer create and update bodies in parity, including null dates and absent targets", () => {
    const value: OfferValue = {
      productType: "RENTAL",
      spuIds: [42],
      status: "PAUSED",
      pricingRules: [
        {
          id: 1,
          label: "整单九折",
          description: "",
          conditionRule: null,
          action: {
            type: "RATIO",
            payload: { ratioBps: 9000 },
          },
          target: { level: "SPU" },
          continue: false,
        },
      ],
      termsVersion: 3,
      startsAt: null,
      endsAt: null,
    };

    expect(toOfferCreateBody(value)).toEqual(value);
    expect(toOfferUpdateBody(value)).toEqual(value);
  });
});
