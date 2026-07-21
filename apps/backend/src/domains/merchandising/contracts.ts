import type {
  ButtonPlacementCreative,
  PlacementBindingRule,
  PlacementType,
} from "./model/placement";
import type { PricingModel, PricingRule } from "./model/pricing";
import type {
  CatalogStatus,
  ProductPresentation,
  ProductType,
  RentalSkuFacts,
  RideHailingSkuFacts,
  ServicePolicy,
  SkuFacts,
  SpuSalesPolicy,
} from "./model/product";

export type {
  ButtonPlacementCreative,
  PlacementBindingRule,
  PlacementType,
} from "./model/placement";
export type {
  FixedTotalPricingModel,
  PriceExplanation,
  PricingModel,
  PricingRule,
  PricingRuleTarget,
} from "./model/pricing";
export type {
  CatalogStatus,
  ProductPresentation,
  ProductType,
  RentalServicePolicy,
  RentalSkuFacts,
  RideHailingSkuFacts,
  ServicePolicy,
  SkuFacts,
  SpuSalesPolicy,
} from "./model/product";
export { createEmptyProductPresentation } from "./model/product";
export {
  assertOfferMatchesSpus,
  assertProductSkuContract,
  assertProductSpuContract,
  assertSkuPolicyBinding,
} from "./services/catalog-contract";
export { resolvePlacementBindingContractForOffer } from "./services/placement-binding-contract";
export { validatePlacementBindingRulesAgainstContract } from "./services/placement-binding";
export { isPlacementMatchingRuleJson } from "./services/placement-rule-engine";

export interface CreateOfferInput {
  productType: ProductType;
  spuIds: number[];
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  pricingRules?: PricingRule[];
  termsVersion?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface CreatePlacementInput {
  placementType?: PlacementType;
  offerId: number;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  matchingRule: unknown;
  priority?: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  creative: ButtonPlacementCreative;
  bindingRules?: PlacementBindingRule[];
}

export interface CreateProductSkuInput {
  spuId: number;
  name: string;
  status?: CatalogStatus;
  sortOrder?: number;
  presentation?: ProductPresentation;
  facts: SkuFacts;
  pricingModel: PricingModel;
  cancellationPolicyRef?: {
    policyId: string;
    policyVersion: number;
  } | null;
}

export interface CreateProductSpuInput {
  name: string;
  productType: ProductType;
  status?: CatalogStatus;
  salesPolicy: SpuSalesPolicy;
  servicePolicy: ServicePolicy;
  presentation: ProductPresentation;
  facts?: Record<string, unknown>;
}

type OrderingOfferDetailSku = {
  skuId: number;
  spuId: number;
  name: string;
  status: CatalogStatus;
  sortOrder: number;
  presentation: ProductPresentation;
  facts: SkuFacts;
  pricingModel: PricingModel;
  cancellationPolicySummary: Array<{
    visibleLabel: string;
    refundPercent: number;
    requiresOperatorHandling: boolean;
  }>;
};

type OrderingOfferDetailSpu = {
  spuId: number;
  name: string;
  status: CatalogStatus;
  productType: ProductType;
  salesPolicy: SpuSalesPolicy;
  servicePolicy: ServicePolicy;
  presentation: ProductPresentation;
  facts: Record<string, unknown>;
  skuOptions: OrderingOfferDetailSku[];
};

export type OrderingOfferDetail = {
  offerId: number;
  productType: ProductType;
  spuIds: number[];
  skuIds: number[];
  pricingPolicy: { rules: PricingRule[] };
  termsVersion: number;
  startsAt: string | null;
  endsAt: string | null;
  spus: OrderingOfferDetailSpu[];
};

type PlacementInstanceProjection = {
  id: number;
  type: PlacementType;
  offerId: number;
  creative: ButtonPlacementCreative;
  bindingRules: PlacementBindingRule[];
};

export type MatchPlacementInstanceResult = {
  placements: PlacementInstanceProjection[];
};

export type OrderingEntryPayload = {
  source: {
    offerId: number;
  };
  offerDetail: OrderingOfferDetail;
  prId?: number;
  bindings: Record<string, unknown>;
  bindingLocks: Record<string, true>;
};

export type PlacementOrderingEntryResult =
  | { outcome: "EXISTING_ORDER"; orderId: string }
  | { outcome: "CREATOR_ELIGIBLE"; orderingEntry: OrderingEntryPayload }
  | { outcome: "NON_CREATOR" }
  | { outcome: "INACTIVE" };

export const isRentalSkuFacts = (value: unknown): value is RentalSkuFacts => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.type === "RENTAL" &&
    typeof record.zoneCode === "string" &&
    typeof record.participantCount === "number" &&
    typeof record.durationMinutes === "number"
  );
};

export const isRideHailingSkuFacts = (value: unknown): value is RideHailingSkuFacts => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.rideHailingProviderInstanceId === "string" &&
    typeof record.providerVehicleTypeCode === "string"
  );
};
