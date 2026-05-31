import { throwHttpProblem } from "../../../lib/problem-details";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import type {
  PlacementBindingRule,
  ButtonPlacementCreative,
  PlacementType,
} from "../model";
import {
  isPlacementMatchingRuleJson,
  resolvePlacementBindingContractForOffer,
  validatePlacementBindingRulesAgainstContract,
} from "../services";

const offerRepo = new OfferRepository();
const placementRepo = new PlacementRepository();

export interface CreatePlacementInput {
  placementType?: PlacementType;
  offerId: number;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  matchingRule: unknown;
  priority?: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  creative: ButtonPlacementCreative;
  bindingRules?: PlacementBindingRule[];
}

export async function createPlacement(input: CreatePlacementInput) {
  if (!isPlacementMatchingRuleJson(input.matchingRule)) {
    return throwHttpProblem({
      status: 400,
      detail: "Placement matchingRule must be a JSONLogic rule",
    });
  }

  const bindingRules = input.bindingRules ?? [];
  const offer = await offerRepo.findById(input.offerId);
  if (!offer) {
    return throwHttpProblem({ status: 404, detail: "Offer not found" });
  }
  const bindingError = validatePlacementBindingRulesAgainstContract({
    rules: bindingRules,
    contract: resolvePlacementBindingContractForOffer(offer),
  });
  if (bindingError) {
    return throwHttpProblem({
      status: 400,
      detail: bindingError,
    });
  }

  return placementRepo.create({
    placementType: input.placementType ?? "BUTTON",
    offerId: input.offerId,
    status: input.status ?? "DRAFT",
    matchingRule: input.matchingRule,
    priority: input.priority ?? 0,
    effectiveFrom: input.effectiveFrom ?? null,
    effectiveTo: input.effectiveTo ?? null,
    creative: input.creative,
    bindingRules,
  });
}
