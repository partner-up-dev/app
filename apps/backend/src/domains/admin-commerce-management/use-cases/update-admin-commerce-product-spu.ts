import { throwHttpProblem } from "../../../lib/problem-details";
import type { ProductSpuId } from "../../../entities/product-spu";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import type {
  CatalogStatus,
  ProductPresentation,
  ProductType,
  ServicePolicy,
  SpuSalesPolicy,
} from "../../merchandising";
import { assertProductSpuContract } from "../../merchandising";

const productSpuRepo = new ProductSpuRepository();

export type UpdateAdminCommerceProductSpuInput = {
  spuId: ProductSpuId;
  name: string;
  productType: ProductType;
  status: CatalogStatus;
  salesPolicy: SpuSalesPolicy;
  servicePolicy: ServicePolicy;
  presentation: ProductPresentation;
  facts: Record<string, unknown>;
};

export async function updateAdminCommerceProductSpu(
  input: UpdateAdminCommerceProductSpuInput,
) {
  const spu = await productSpuRepo.findById(input.spuId);
  if (!spu) {
    return throwHttpProblem({ status: 404, detail: "Product SPU not found" });
  }

  assertProductSpuContract({
    productType: input.productType,
    servicePolicy: input.servicePolicy,
  });

  return productSpuRepo.updateById(input.spuId, {
    name: input.name,
    productType: input.productType,
    status: input.status,
    salesPolicy: input.salesPolicy,
    servicePolicy: input.servicePolicy,
    presentation: input.presentation,
    facts: input.facts,
    version: spu.version + 1,
  });
}
