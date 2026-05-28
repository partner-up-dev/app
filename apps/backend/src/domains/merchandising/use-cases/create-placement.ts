import { throwHttpProblem } from "../../../lib/problem-details";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import type {
  ButtonPlacementCreative,
  PlacementSlotKey,
  PlacementTarget,
  PlacementType,
} from "../model";

const offerRepo = new OfferRepository();
const placementRepo = new PlacementRepository();

export interface CreatePlacementInput {
  slotKey: PlacementSlotKey;
  placementType?: PlacementType;
  status?: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  matchingRule: unknown;
  priority?: number;
  creative: ButtonPlacementCreative;
  target: PlacementTarget;
}

export async function createPlacement(input: CreatePlacementInput) {
  if (input.target.kind === "OFFER") {
    const offer = await offerRepo.findById(input.target.offerId);
    if (!offer) {
      return throwHttpProblem({ status: 404, detail: "Offer not found" });
    }
  }

  return placementRepo.create({
    slotKey: input.slotKey,
    placementType: input.placementType ?? "BUTTON",
    status: input.status ?? "DRAFT",
    matchingRule: input.matchingRule,
    priority: input.priority ?? 0,
    creative: input.creative,
    target: input.target,
  });
}
