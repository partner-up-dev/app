import { throwHttpProblem } from "../../../lib/problem-details";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";
import { assertSkuPolicyBinding } from "../services";

export type CreateSkuCancellationPolicyInput = {
  policyId: string;
  policyVersion: number;
  skuId: number;
  basis?: "CUSTOMER_PAID_AMOUNT";
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

const productSkuRepo = new ProductSkuRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();

export async function createSkuCancellationPolicy(
  input: CreateSkuCancellationPolicyInput,
) {
  const sku = await productSkuRepo.findById(input.skuId);
  if (!sku) {
    return throwHttpProblem({ status: 404, detail: "Product SKU not found" });
  }

  assertSkuPolicyBinding({
    sku,
    referencedSkuId: input.skuId,
  });

  return skuCancellationPolicyRepo.create({
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    skuId: input.skuId,
    basis: input.basis ?? "CUSTOMER_PAID_AMOUNT",
    operatorBufferMinutes: input.operatorBufferMinutes,
    tiers: input.tiers,
  });
}
