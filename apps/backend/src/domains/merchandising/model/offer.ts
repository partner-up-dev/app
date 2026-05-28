import type { ProductType } from "./product";
import type { PricingRule } from "./pricing";

export type OfferTermVersion = {
  version: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

export type Offer = {
  id: number;
  productType: ProductType;
  spuIds: number[];
  pricingRules: PricingRule[];
  termVersion: OfferTermVersion;
};
