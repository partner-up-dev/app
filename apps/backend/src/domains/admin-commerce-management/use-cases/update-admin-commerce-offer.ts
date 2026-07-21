import { throwHttpProblem } from "../../../lib/problem-details";
import type { OfferId } from "../../../entities/offer";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import type { PricingRule, ProductType } from "../../merchandising/contracts";
import { assertOfferMatchesSpus } from "../../merchandising/contracts";

const offerRepo = new OfferRepository();
const productSpuRepo = new ProductSpuRepository();

export type UpdateAdminCommerceOfferInput = {
  offerId: OfferId;
  productType: ProductType;
  spuIds: number[];
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  pricingRules: PricingRule[];
  termsVersion: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

export async function updateAdminCommerceOffer(input: UpdateAdminCommerceOfferInput) {
  const offer = await offerRepo.findById(input.offerId);
  if (!offer) {
    return throwHttpProblem({ status: 404, detail: "Offer not found" });
  }

  const spus = await Promise.all(input.spuIds.map((spuId) => productSpuRepo.findById(spuId)));
  if (spus.some((spu) => spu === null)) {
    return throwHttpProblem({
      status: 404,
      detail: "One or more referenced SPUs were not found",
    });
  }

  assertOfferMatchesSpus({
    productType: input.productType,
    spus: spus as Array<{ id: number; productType: ProductType }>,
  });

  return offerRepo.updateById(input.offerId, {
    productType: input.productType,
    spuIds: input.spuIds,
    status: input.status,
    pricingPolicy: { rules: input.pricingRules },
    termsVersion: input.termsVersion,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
  });
}
