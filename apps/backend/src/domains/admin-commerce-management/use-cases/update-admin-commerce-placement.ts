import { throwHttpProblem } from "../../../lib/problem-details";
import type { PlacementId } from "../../../entities/placement";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import type {
  ButtonPlacementCreative,
  PlacementBindingRule,
  PlacementType,
} from "../../merchandising/contracts";
import {
  isPlacementMatchingRuleJson,
  resolvePlacementBindingContractForOffer,
  validatePlacementBindingRulesAgainstContract,
} from "../../merchandising/contracts";

const offerRepo = new OfferRepository();
const placementRepo = new PlacementRepository();

export type UpdateAdminCommercePlacementInput = {
  placementId: PlacementId;
  placementType: PlacementType;
  offerId: number;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  matchingRule: unknown;
  priority: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  creative: ButtonPlacementCreative;
  bindingRules: PlacementBindingRule[];
};

export async function updateAdminCommercePlacement(input: UpdateAdminCommercePlacementInput) {
  const placement = await placementRepo.findById(input.placementId);
  if (!placement) {
    return throwHttpProblem({ status: 404, detail: "Placement not found" });
  }

  if (!isPlacementMatchingRuleJson(input.matchingRule)) {
    return throwHttpProblem({
      status: 400,
      detail: "Placement matchingRule must be a JSONLogic rule",
    });
  }

  const offer = await offerRepo.findById(input.offerId);
  if (!offer) {
    return throwHttpProblem({ status: 404, detail: "Offer not found" });
  }
  const bindingError = validatePlacementBindingRulesAgainstContract({
    rules: input.bindingRules,
    contract: resolvePlacementBindingContractForOffer(offer),
  });
  if (bindingError) {
    return throwHttpProblem({
      status: 400,
      detail: bindingError,
    });
  }

  return placementRepo.updateById(input.placementId, {
    placementType: input.placementType,
    offerId: input.offerId,
    status: input.status,
    matchingRule: input.matchingRule,
    priority: input.priority,
    effectiveFrom: input.effectiveFrom ?? null,
    effectiveTo: input.effectiveTo ?? null,
    creative: input.creative,
    bindingRules: input.bindingRules,
  });
}
