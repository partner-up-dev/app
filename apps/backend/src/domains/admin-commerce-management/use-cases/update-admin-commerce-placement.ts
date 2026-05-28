import { throwHttpProblem } from "../../../lib/problem-details";
import type { PlacementId } from "../../../entities/placement";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import type {
  ButtonPlacementCreative,
  PlacementSlotKey,
  PlacementTarget,
  PlacementType,
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
};

export async function updateAdminCommercePlacement(
  input: UpdateAdminCommercePlacementInput,
) {
  const placement = await placementRepo.findById(input.placementId);
  if (!placement) {
    return throwHttpProblem({ status: 404, detail: "Placement not found" });
  }

  if (input.target.kind === "OFFER") {
    const offer = await offerRepo.findById(input.target.offerId);
    if (!offer) {
      return throwHttpProblem({ status: 404, detail: "Offer not found" });
    }
  }

  return placementRepo.updateById(input.placementId, {
    slotKey: input.slotKey,
    placementType: input.placementType,
    status: input.status,
    matchingRule: input.matchingRule,
    priority: input.priority,
    creative: input.creative,
    target: input.target,
  });
}
