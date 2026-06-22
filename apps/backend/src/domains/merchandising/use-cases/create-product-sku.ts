import { throwHttpProblem } from "../../../lib/problem-details";
import type { ProductSpuId } from "../../../entities/product-spu";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import type { CatalogStatus, PricingModel, ProductPresentation, SkuFacts } from "../model";
import { createEmptyProductPresentation } from "../model";
import { assertProductSkuContract } from "../services";

const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();

export interface CreateProductSkuInput {
  spuId: ProductSpuId;
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

export async function createProductSku(input: CreateProductSkuInput) {
  const spu = await productSpuRepo.findById(input.spuId);
  if (!spu) {
    return throwHttpProblem({ status: 404, detail: "Product SPU not found" });
  }

  assertProductSkuContract({
    spu,
    facts: input.facts,
  });

  return productSkuRepo.create({
    spuId: input.spuId,
    name: input.name,
    status: input.status ?? "DRAFT",
    sortOrder: input.sortOrder ?? 0,
    presentation: input.presentation ?? createEmptyProductPresentation(),
    facts: input.facts,
    pricingModel: input.pricingModel,
    cancellationPolicyRef: input.cancellationPolicyRef ?? null,
  });
}
