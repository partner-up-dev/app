import type {
  PricingRule,
  ProductSku,
  ProductSpu,
  ProductType,
  ServicePolicy,
  SkuFacts,
} from "../model";

function assertProductTypeMatchesServicePolicy(
  productType: ProductType,
  servicePolicy: ServicePolicy,
): void {
  if (productType !== servicePolicy.type) {
    throw new Error("SPU productType must match servicePolicy.type");
  }
}

function assertSpuPricingPolicyTargets(rules: PricingRule[]): void {
  if (rules.some((rule) => rule.target.level !== "SKU")) {
    throw new Error("SPU pricing policy may target SKU only");
  }
}

function assertSkuFactsMatchProductType(
  productType: ProductType,
  facts: SkuFacts,
): void {
  if (productType !== facts.type) {
    throw new Error("SKU facts type must match SPU productType");
  }
}

export function assertProductSpuContract(input: {
  productType: ProductType;
  servicePolicy: ServicePolicy;
  pricingRules: PricingRule[];
}): void {
  assertProductTypeMatchesServicePolicy(
    input.productType,
    input.servicePolicy,
  );
  assertSpuPricingPolicyTargets(input.pricingRules);
}

export function assertProductSkuContract(input: {
  spu: Pick<ProductSpu, "productType">;
  facts: SkuFacts;
}): void {
  assertSkuFactsMatchProductType(input.spu.productType, input.facts);
}

export function assertOfferMatchesSpus(input: {
  productType: ProductType;
  spus: Array<Pick<ProductSpu, "id" | "productType">>;
}): void {
  if (input.spus.length === 0) {
    throw new Error("Offer must reference at least one SPU");
  }

  if (
    input.spus.some((spu) => spu.productType !== input.productType)
  ) {
    throw new Error("Offer productType must match every referenced SPU");
  }
}

export function assertSkuPolicyBinding(input: {
  sku: Pick<ProductSku, "id" | "spuId">;
  referencedSkuId: number;
}): void {
  if (input.sku.id !== input.referencedSkuId) {
    throw new Error("Cancellation policy must bind to the referenced SKU");
  }
}
