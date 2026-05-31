import { throwHttpProblem } from "../../../lib/problem-details";
import type { PlacementId } from "../../../entities/placement";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import type {
  ButtonPlacementCreative,
  PlacementBindingRule,
  PlacementSlotKey,
  PlacementTarget,
  PlacementType,
} from "../../merchandising";
import {
  isPlacementMatchingRuleJson,
  validatePlacementBindingRules,
} from "../../merchandising";

const offerRepo = new OfferRepository();
const placementRepo = new PlacementRepository();

export type UpdateAdminCommercePlacementInput = {
  placementId: PlacementId;
  slotKey: PlacementSlotKey;
  placementType: PlacementType;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  matchingRule: unknown;
  priority: number;
  creative: ButtonPlacementCreative;
  target: PlacementTarget;
  bindingRules: PlacementBindingRule[];
};

export async function updateAdminCommercePlacement(
  input: UpdateAdminCommercePlacementInput,
) {
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

  if (input.target.kind === "OFFER") {
    const offer = await offerRepo.findById(input.target.offerId);
    if (!offer) {
      return throwHttpProblem({ status: 404, detail: "Offer not found" });
    }
  }

  const bindingError = validatePlacementBindingRules(input.bindingRules);
  if (bindingError) {
    return throwHttpProblem({
      status: 400,
      detail: bindingError,
    });
  }

  return placementRepo.updateById(input.placementId, {
    slotKey: input.slotKey,
    placementType: input.placementType,
    status: input.status,
    matchingRule: input.matchingRule,
    priority: input.priority,
    creative: input.creative,
    target: input.target,
    bindingRules: input.bindingRules,
  });
}
