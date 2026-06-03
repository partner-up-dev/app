import { throwHttpProblem } from "../../../lib/problem-details";
import type { ProductSkuId } from "../../../entities/product-sku";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";
import { assertSkuPolicyBinding } from "../../merchandising";

const productSkuRepo = new ProductSkuRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();

export type SaveAdminCommerceSkuCancellationPolicyInput = {
  skuId: ProductSkuId;
  operatorBufferMinutes: number;
  tiers: Array<{
    code: string;
    fromMinutesBeforeStart: number | null;
    untilMinutesBeforeStart: number | null;
    refundPercent: number;
    requiresOperatorHandling: boolean;
    visibleLabel: string;
  }>;
};

export async function saveAdminCommerceSkuCancellationPolicy(
  input: SaveAdminCommerceSkuCancellationPolicyInput,
) {
  const sku = await productSkuRepo.findById(input.skuId);
  if (!sku) {
    return throwHttpProblem({ status: 404, detail: "Product SKU not found" });
  }

  const latestPolicy = await skuCancellationPolicyRepo.findLatestBySkuId(input.skuId);
  const policyId = latestPolicy?.policyId ?? `sku-${input.skuId}-policy`;
  const policyVersion = (latestPolicy?.policyVersion ?? 0) + 1;

  assertSkuPolicyBinding({
    sku,
    referencedSkuId: input.skuId,
  });

  const policy = await skuCancellationPolicyRepo.create({
    policyId,
    policyVersion,
    skuId: input.skuId,
    basis: "CUSTOMER_PAID_AMOUNT",
    operatorBufferMinutes: input.operatorBufferMinutes,
    tiers: input.tiers,
  });

  const updatedSku = await productSkuRepo.updateById(input.skuId, {
    cancellationPolicyRef: {
      policyId,
      policyVersion,
    },
    version: sku.version + 1,
  });

  return {
    policy,
    sku: updatedSku,
  };
}
