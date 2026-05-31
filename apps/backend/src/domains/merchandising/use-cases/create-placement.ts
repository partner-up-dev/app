import { throwHttpProblem } from "../../../lib/problem-details";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import type {
  PlacementBindingRule,
  ButtonPlacementCreative,
  PlacementSlotKey,
  PlacementTarget,
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
  slotKey: PlacementSlotKey;
  placementType?: PlacementType;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  matchingRule: unknown;
  priority?: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  creative: ButtonPlacementCreative;
  target: PlacementTarget;
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
  if (input.target.kind === "OFFER") {
    const offer = await offerRepo.findById(input.target.offerId);
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
  }

  return placementRepo.create({
    slotKey: input.slotKey,
    placementType: input.placementType ?? "BUTTON",
    status: input.status ?? "DRAFT",
    matchingRule: input.matchingRule,
    priority: input.priority ?? 0,
    effectiveFrom: input.effectiveFrom ?? null,
    effectiveTo: input.effectiveTo ?? null,
    creative: input.creative,
    target: input.target,
    bindingRules,
  });
}
