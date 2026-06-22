export type ProductType = "RENTAL" | "RIDE_HAILING";

export type CatalogStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type SkuSelectionPolicy =
  | {
      type: "EXACTLY_ONE";
    }
  | {
      type: "CHOICE_SET";
      min: number;
      max?: number | null;
      resolvesTo: 1;
    };

export type QuantityPolicy =
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

export type RentalServicePolicy = {
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
};

export type RideHailingServicePolicy = {
  type: "RIDE_HAILING";
};

export type ServicePolicy = RentalServicePolicy | RideHailingServicePolicy;

export type SpuSalesPolicy = {
  skuSelectionPolicy: SkuSelectionPolicy;
  quantityPolicy: QuantityPolicy;
};

export type RentalSkuFacts = {
  type: "RENTAL";
  zoneCode: string;
  participantCount: number;
  durationMinutes: number;
};

export type RideHailingSkuFacts = {
  rideHailingProviderInstanceId: string;
  providerVehicleTypeCode: string;
};

export type SkuFacts = RentalSkuFacts | RideHailingSkuFacts;

export type ProductPresentation = {
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

export function createEmptyProductPresentation(): ProductPresentation {
  return {
    heroImageAssetIds: [],
    detailImageAssetIds: [],
    sellingPoints: [],
    parameterGroups: [],
    noticeBlocks: [],
  };
}

export type ProductSpu = {
  id: number;
  version: number;
  status: CatalogStatus;
  name: string;
  productType: ProductType;
  salesPolicy: SpuSalesPolicy;
  servicePolicy: ServicePolicy;
  presentation: ProductPresentation;
  facts: Record<string, unknown>;
};

export type ProductSku = {
  id: number;
  spuId: number;
  version: number;
  status: CatalogStatus;
  name: string;
  sortOrder: number;
  presentation: ProductPresentation;
  facts: SkuFacts;
  pricingModel: PricingModel;
  cancellationPolicyRef?: {
    policyId: string;
    policyVersion: number;
  } | null;
};
import type { PricingModel, PricingRule } from "./pricing";
