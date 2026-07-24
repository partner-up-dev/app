export type ProductType = "RENTAL" | "RIDE_HAILING";
export type ProductCatalogStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ProductPresentationValue = {
  heroImageAssetIds: string[];
  detailImageAssetIds: string[];
  sellingPoints: string[];
  parameterGroups: Array<{
    title: string;
    items: Array<{
      label: string;
      value: string;
    }>;
  }>;
  noticeBlocks: Array<{
    title: string;
    content: string;
  }>;
};

export type ProductSpuValue = {
  name: string;
  productType: ProductType;
  status: ProductCatalogStatus;
  salesPolicy: {
    skuSelectionPolicy:
      | {
          type: "EXACTLY_ONE";
        }
      | {
          type: "CHOICE_SET";
          min: number;
          max?: number | null;
          resolvesTo: 1;
        };
    quantityPolicy:
      | {
          type: "FIXED";
          quantity: number;
        }
      | {
          type: "PER_PARTICIPANT";
        }
      | {
          type: "USER_SELECTED";
          min: number;
          max: number;
        };
  };
  servicePolicy:
    | {
        type: "RENTAL";
        bookingLeadTimeMinutes: number;
        serviceWindow?: {
          weekdays: number[];
          startTime: string;
          endTime: string;
        };
        requiresContactPhone: boolean;
        requiresRealName: boolean;
        requiresNationalId: boolean;
      }
    | {
        type: "RIDE_HAILING";
      };
  presentation: ProductPresentationValue;
  facts: Record<string, unknown>;
};

export type ProductSkuValue = {
  name: string;
  status: ProductCatalogStatus;
  sortOrder: number;
  presentation: ProductPresentationValue;
  facts:
    | {
        type: "RENTAL";
        zoneCode: string;
        participantCount: number;
        durationMinutes: number;
      }
    | {
        rideHailingProviderInstanceId: string;
        providerVehicleTypeCode: string;
      };
  pricingModel:
    | {
        type: "FIXED_TOTAL";
        amountFen: number;
      }
    | {
        type: "DYNAMIC_QUOTE";
        calculatorSpec: unknown;
      };
  cancellationPolicyRef?: {
    policyId: string;
    policyVersion: number;
  } | null;
};

export type SkuCancellationPolicyValue = {
  operatorBufferMinutes: number;
  tiers: Array<{
    code: string;
    fromMinutesBeforeStart: number | null;
    untilMinutesBeforeStart: number | null;
    refundPercent: number;
    requiresOperatorHandling: boolean;
    visibleLabel: string;
  }>;
};
