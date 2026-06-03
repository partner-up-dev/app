import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";

const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();

export async function getAdminCommerceProductWorkspace() {
  const spus = await productSpuRepo.listAll();

  const products = await Promise.all(
    spus.map(async (spu) => {
      const skus = await productSkuRepo.listBySpuId(spu.id);
      const skuRecords = await Promise.all(
        skus.map(async (sku) => {
          const cancellationPolicy = sku.cancellationPolicyRef
            ? await skuCancellationPolicyRepo.findByRef(
                sku.cancellationPolicyRef.policyId,
                sku.cancellationPolicyRef.policyVersion,
              )
            : await skuCancellationPolicyRepo.findLatestBySkuId(sku.id);

          return {
            sku,
            cancellationPolicy,
          };
        }),
      );

      return {
        spu,
        skus: skuRecords,
      };
    }),
  );

  return { products };
}
