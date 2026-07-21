import { throwHttpProblem } from "../../../lib/problem-details";
import type { ProductSpuId } from "../../../entities/product-spu";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import type { CreateProductSkuInput } from "../contracts";
import { createEmptyProductPresentation } from "../model";
import { assertProductSkuContract } from "../services";

export type { CreateProductSkuInput } from "../contracts";

const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();

export async function createProductSku(input: CreateProductSkuInput) {
  const spuId = input.spuId as ProductSpuId;
  const spu = await productSpuRepo.findById(spuId);
  if (!spu) {
    return throwHttpProblem({ status: 404, detail: "Product SPU not found" });
  }

  assertProductSkuContract({
    spu,
    facts: input.facts,
  });

  return productSkuRepo.create({
    spuId,
    name: input.name,
    status: input.status ?? "DRAFT",
    sortOrder: input.sortOrder ?? 0,
    presentation: input.presentation ?? createEmptyProductPresentation(),
    facts: input.facts,
    pricingModel: input.pricingModel,
    cancellationPolicyRef: input.cancellationPolicyRef ?? null,
  });
}
