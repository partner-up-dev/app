import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import type { CreateProductSpuInput } from "../contracts";
import { assertProductSpuContract } from "../services";

export type { CreateProductSpuInput } from "../contracts";

const productSpuRepo = new ProductSpuRepository();

export async function createProductSpu(input: CreateProductSpuInput) {
  assertProductSpuContract({
    productType: input.productType,
    servicePolicy: input.servicePolicy,
  });

  return productSpuRepo.create({
    name: input.name,
    productType: input.productType,
    status: input.status ?? "DRAFT",
    salesPolicy: input.salesPolicy,
    servicePolicy: input.servicePolicy,
    presentation: input.presentation,
    facts: input.facts ?? {},
  });
}
