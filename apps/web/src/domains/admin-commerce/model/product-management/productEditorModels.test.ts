import { describe, expect, it } from "vitest";
import {
  buildPolicyInput,
  toPolicyForm,
} from "@/domains/admin-commerce/model/product-management/cancellationPolicyEditorModel";
import {
  buildSkuInput,
  toSkuForm,
} from "@/domains/admin-commerce/model/product-management/skuEditorModel";
import type {
  ProductSkuValue,
  SkuCancellationPolicyValue,
} from "@/domains/admin-commerce/model/product-management/productValues";

describe("admin commerce product editor models", () => {
  it("round-trips the cancellation fields owned by the editor", () => {
    const value: SkuCancellationPolicyValue = {
      operatorBufferMinutes: 45,
      tiers: [
        {
          code: "LATE",
          fromMinutesBeforeStart: 0,
          untilMinutesBeforeStart: null,
          refundPercent: 20,
          requiresOperatorHandling: true,
          visibleLabel: "临近开始",
        },
      ],
    };

    expect(
      buildPolicyInput(toPolicyForm(value), {
        operatorBufferMinutesLabel: "buffer",
        tierFromLabel: "from",
        tierUntilLabel: "until",
        refundPercentLabel: "refund",
      }),
    ).toEqual(value);
  });

  it("preserves a dynamic SKU pricing model and a null cancellation reference", () => {
    const value: ProductSkuValue = {
      name: "实时车型",
      status: "ACTIVE",
      sortOrder: 4,
      presentation: {
        heroImageAssetIds: [],
        detailImageAssetIds: [],
        sellingPoints: [],
        parameterGroups: [],
        noticeBlocks: [],
      },
      facts: {
        rideHailingProviderInstanceId: "provider",
        providerVehicleTypeCode: "comfort",
      },
      pricingModel: {
        type: "DYNAMIC_QUOTE",
        calculatorSpec: { version: 1 },
      },
      cancellationPolicyRef: null,
    };

    expect(
      buildSkuInput(
        toSkuForm(value),
        "RIDE_HAILING",
        value.presentation,
        value.cancellationPolicyRef,
        {
          sortOrderLabel: "sort",
          participantCountLabel: "participants",
          durationMinutesLabel: "duration",
          amountFenLabel: "amount",
          dynamicPricingMissingError: "missing",
        },
      ),
    ).toEqual(value);
  });
});
