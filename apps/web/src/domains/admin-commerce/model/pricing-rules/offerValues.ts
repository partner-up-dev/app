import type { ProductType } from "@/domains/admin-commerce/model/product-management/productValues";

export type OfferStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

export type CommercePricingRuleValue = {
  id: number;
  label: string;
  description: string;
  conditionRule: unknown;
  action:
    | {
        type: "RESET";
        payload: {
          pricingModel: unknown;
        };
      }
    | {
        type: "MINUS";
        payload: {
          amountFen: number;
        };
      }
    | {
        type: "RATIO";
        payload: {
          ratioBps: number;
        };
      };
  target:
    | {
        level: "SKU";
        skuId?: number;
      }
    | {
        level: "SPU";
        spuId?: number;
      }
    | {
        level: "ORDER";
      };
  continue: boolean;
};

export type OfferValue = {
  productType: ProductType;
  spuIds: number[];
  status: OfferStatus;
  pricingRules: CommercePricingRuleValue[];
  termsVersion: number;
  startsAt: string | null;
  endsAt: string | null;
};
