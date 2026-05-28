export type ProductType = "RENTAL" | "RIDE_HAILING";

export type CatalogStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type SkuSelectionPolicy = {
  type: "EXACTLY_ONE";
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
  requiresContactPhone: boolean;
  requiresRealName: boolean;
  requiresNationalId: boolean;
};

export type RideHailingServicePolicy = {
  type: "RIDE_HAILING";
};

export type ServicePolicy =
  | RentalServicePolicy
  | RideHailingServicePolicy;

export type RentalSkuFacts = {
  type: "RENTAL";
  zoneCode: string;
  participantCount: number;
  durationMinutes: number;
};

export type RideHailingSkuFacts = {
  type: "RIDE_HAILING";
  vehicleClass: string;
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
