import { throwHttpProblem } from "../../../lib/problem-details";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { ProductSpuRepository } from "../../../repositories/ProductSpuRepository";
import type { PricingRule, ProductType } from "../model";
import { assertOfferMatchesSpus } from "../services";

const offerRepo = new OfferRepository();
const productSpuRepo = new ProductSpuRepository();

export interface CreateOfferInput {
  productType: ProductType;
  spuIds: number[];
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  pricingRules?: PricingRule[];
  termsVersion?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export async function createOffer(input: CreateOfferInput) {
  const spus = await Promise.all(
    input.spuIds.map((spuId) => productSpuRepo.findById(spuId)),
  );
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

  return offerRepo.create({
    productType: input.productType,
    spuIds: input.spuIds,
    status: input.status ?? "DRAFT",
    pricingPolicy: { rules: input.pricingRules ?? [] },
    termsVersion: input.termsVersion ?? 1,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
  });
}
