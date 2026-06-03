import { throwHttpProblem } from "../../../lib/problem-details";
import type { ProductSkuId } from "../../../entities/product-sku";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import type {
  CatalogStatus,
  PricingModel,
  SkuFacts,
} from "../../merchandising";
import { assertProductSkuContract } from "../../merchandising";

const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();

export type UpdateAdminCommerceProductSkuInput = {
  skuId: ProductSkuId;
  name: string;
  status: CatalogStatus;
  sortOrder: number;
  facts: SkuFacts;
  pricingModel: PricingModel;
  cancellationPolicyRef?: {
    policyId: string;
    policyVersion: number;
  } | null;
};

export async function updateAdminCommerceProductSku(
  input: UpdateAdminCommerceProductSkuInput,
) {
  const sku = await productSkuRepo.findById(input.skuId);
  if (!sku) {
    return throwHttpProblem({ status: 404, detail: "Product SKU not found" });
  }

  const spu = await productSpuRepo.findById(sku.spuId);
  if (!spu) {
    return throwHttpProblem({ status: 404, detail: "Product SPU not found" });
  }

  assertProductSkuContract({
    spu,
    facts: input.facts,
  });

  return productSkuRepo.updateById(input.skuId, {
    name: input.name,
    status: input.status,
    sortOrder: input.sortOrder,
    facts: input.facts,
    pricingModel: input.pricingModel,
    cancellationPolicyRef: input.cancellationPolicyRef ?? null,
    version: sku.version + 1,
  });
}
