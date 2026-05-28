import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import type {
  CatalogStatus,
  PricingRule,
  ProductPresentation,
  ProductType,
  ServicePolicy,
  SpuSalesPolicy,
} from "../model";
import { assertProductSpuContract } from "../services";

const productSpuRepo = new ProductSpuRepository();

export interface CreateProductSpuInput {
  name: string;
  productType: ProductType;
  status?: CatalogStatus;
  salesPolicy: SpuSalesPolicy;
  servicePolicy: ServicePolicy;
  pricingRules?: PricingRule[];
  presentation: ProductPresentation;
  facts?: Record<string, unknown>;
}

export async function createProductSpu(input: CreateProductSpuInput) {
  assertProductSpuContract({
    productType: input.productType,
    servicePolicy: input.servicePolicy,
    pricingRules: input.pricingRules ?? [],
  });

  return productSpuRepo.create({
    name: input.name,
    productType: input.productType,
    status: input.status ?? "DRAFT",
    salesPolicy: input.salesPolicy,
    servicePolicy: input.servicePolicy,
    pricingPolicy: { rules: input.pricingRules ?? [] },
    presentation: input.presentation,
    facts: input.facts ?? {},
  });
}
