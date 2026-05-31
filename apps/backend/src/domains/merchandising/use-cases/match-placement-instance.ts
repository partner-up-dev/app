import { throwHttpProblem } from "../../../lib/problem-details";
import { OfferRepository } from "../../../repositories/OfferRepository";
import { PlacementRepository } from "../../../repositories/PlacementRepository";
import type { PlacementId } from "../../../entities/placement";
import type { PlacementType } from "../model";
import {
  isPlacementActiveAt,
  listMatchingPlacementCandidates,
  resolvePlacementBindings,
} from "../services";

const placementRepo = new PlacementRepository();
const offerRepo = new OfferRepository();

export type PlacementInstanceProjection = {
  id: number;
  type: PlacementType;
  offerId: number;
  creative: {
    ctaLabel: string;
    description?: string | null;
  };
  bindingRules: Array<{
    fieldKey: string;
    contextPath: string;
    lock: true;
  }>;
};

export type MatchPlacementInstanceResult = {
  placements: PlacementInstanceProjection[];
};

const isOfferActiveNow = (
  offer: { status: string; startsAt: Date | null; endsAt: Date | null },
  now = new Date(),
): boolean => {
  if (offer.status !== "ACTIVE") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt <= now) return false;
  return true;
};

export async function matchPlacementInstance(input: {
  type: PlacementType;
  matchingContext: unknown;
}): Promise<MatchPlacementInstanceResult> {
  const placementCandidates = await placementRepo.listActiveByType({
    placementType: input.type,
  });
  const matchingPlacements = listMatchingPlacementCandidates({
    candidates: placementCandidates,
    context: input.matchingContext,
  });

  const placements: PlacementInstanceProjection[] = [];
  for (const placement of matchingPlacements) {
    if (!isPlacementActiveAt(placement)) continue;
    const offer = await offerRepo.findById(placement.offerId);
    if (!offer || !isOfferActiveNow(offer)) continue;
    placements.push({
      id: placement.id,
      type: placement.placementType,
      offerId: placement.offerId,
      creative: placement.creative,
      bindingRules: placement.bindingRules,
    });
  }

  return { placements };
}

export async function resolvePlacementInstanceBindings(input: {
  placementInstanceId: PlacementId;
  matchingContext: unknown;
}): Promise<{ bindings: Record<string, unknown> }> {
  const placement = await placementRepo.findById(input.placementInstanceId);
  if (!placement) {
    return throwHttpProblem({ status: 404, detail: "Placement not found" });
  }
  if (!isPlacementActiveAt(placement)) {
    return throwHttpProblem({ status: 409, detail: "Placement is not active" });
  }
  return {
    bindings: resolvePlacementBindings({
      context: input.matchingContext,
      rules: placement.bindingRules,
    }),
  };
}
