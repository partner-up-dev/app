import { throwHttpProblem } from "../../../lib/problem-details";
import type { Offer, OfferId } from "../../../entities/offer";
import type { ProductSku } from "../../../entities/product-sku";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { ProductSkuRepository } from "../../../repositories/ProductSkuRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import { SkuCancellationPolicyRepository } from "../../../repositories/SkuCancellationPolicyRepository";
import type { OrderingOfferDetail } from "../contracts";
import type { FixedTotalPricingModel } from "../model";

export type { OrderingOfferDetail } from "../contracts";
export { isRentalSkuFacts, isRideHailingSkuFacts } from "../contracts";

const offerRepo = new OfferRepository();
const productSpuRepo = new ProductSpuRepository();
const productSkuRepo = new ProductSkuRepository();
const skuCancellationPolicyRepo = new SkuCancellationPolicyRepository();

type OrderingOfferDetailSpu = OrderingOfferDetail["spus"][number];
type OrderingOfferDetailSku = OrderingOfferDetailSpu["skuOptions"][number];

const isActiveNow = (offer: Offer, now = new Date()): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt <= now) return false;
  return true;
};

async function buildCancellationPolicySummary(sku: ProductSku) {
  const ref = sku.cancellationPolicyRef;
  const policy = ref
    ? await skuCancellationPolicyRepo.findByRef(ref.policyId, ref.policyVersion)
    : await skuCancellationPolicyRepo.findLatestBySkuId(sku.id);

  return (
    policy?.tiers.map((tier) => ({
      visibleLabel: tier.visibleLabel,
      refundPercent: tier.refundPercent,
      requiresOperatorHandling: tier.requiresOperatorHandling,
    })) ?? []
  );
}

export const isFixedTotalPricingModel = (
  value: ProductSku["pricingModel"],
): value is FixedTotalPricingModel => value.type === "FIXED_TOTAL";

export async function getOrderingOfferDetail(input: {
  offerId: number;
}): Promise<OrderingOfferDetail> {
  const offer = await offerRepo.findById(input.offerId as OfferId);
  if (!offer) {
    return throwHttpProblem({ status: 404, detail: "Offer not found" });
  }
  if (!isActiveNow(offer)) {
    return throwHttpProblem({ status: 409, detail: "Offer is not active" });
  }

  const spus: OrderingOfferDetailSpu[] = [];
  const skuIds: number[] = [];
  for (const spuId of offer.spuIds) {
    const spu = await productSpuRepo.findById(spuId);
    if (!spu || spu.status !== "ACTIVE" || spu.productType !== offer.productType) {
      continue;
    }

    const skus = await productSkuRepo.listBySpuId(spu.id);
    const skuOptions: OrderingOfferDetailSku[] = [];
    for (const sku of skus) {
      if (sku.status !== "ACTIVE") continue;
      skuIds.push(sku.id);
      skuOptions.push({
        skuId: sku.id,
        spuId: spu.id,
        name: sku.name,
        status: sku.status,
        sortOrder: sku.sortOrder,
        presentation: sku.presentation,
        facts: sku.facts,
        pricingModel: sku.pricingModel,
        cancellationPolicySummary: await buildCancellationPolicySummary(sku),
      });
    }

    spus.push({
      spuId: spu.id,
      name: spu.name,
      status: spu.status,
      productType: spu.productType,
      salesPolicy: spu.salesPolicy,
      servicePolicy: spu.servicePolicy,
      presentation: spu.presentation,
      facts: spu.facts,
      skuOptions,
    });
  }

  return {
    offerId: offer.id,
    productType: offer.productType,
    spuIds: offer.spuIds,
    skuIds,
    pricingPolicy: offer.pricingPolicy,
    termsVersion: offer.termsVersion,
    startsAt: offer.startsAt?.toISOString() ?? null,
    endsAt: offer.endsAt?.toISOString() ?? null,
    spus,
  };
}
