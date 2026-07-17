import type { Placement } from "../../../entities/placement";
import { doesPlacementRuleMatch } from "./placement-rule-engine";

export type PlacementSelectionCandidate = Pick<Placement, "id" | "priority" | "matchingRule"> &
  Partial<Pick<Placement, "status" | "effectiveFrom" | "effectiveTo">>;

export function isPlacementActiveAt(
  placement: Partial<Pick<Placement, "status" | "effectiveFrom" | "effectiveTo">>,
  now = new Date(),
): boolean {
  if (placement.status && placement.status !== "ACTIVE") return false;
  if (placement.effectiveFrom && placement.effectiveFrom > now) return false;
  if (placement.effectiveTo && placement.effectiveTo <= now) return false;
  return true;
}

export function listMatchingPlacementCandidates<T extends PlacementSelectionCandidate>(input: {
  candidates: readonly T[];
  context: unknown;
}): T[] {
  return [...input.candidates]
    .sort((left, right) => right.priority - left.priority || right.id - left.id)
    .filter((candidate) => isPlacementActiveAt(candidate))
    .filter((candidate) =>
      doesPlacementRuleMatch({
        context: input.context,
        rule: candidate.matchingRule,
      }),
    );
}
