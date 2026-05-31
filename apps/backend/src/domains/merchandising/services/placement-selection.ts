import type { Placement } from "../../../entities/placement";
import { doesPlacementRuleMatch } from "./placement-rule-engine";

export type PlacementSelectionCandidate = Pick<
  Placement,
  "id" | "priority" | "matchingRule"
>;

export function listMatchingPlacementCandidates<
  T extends PlacementSelectionCandidate,
>(input: {
  candidates: readonly T[];
  context: unknown;
}): T[] {
  return [...input.candidates]
    .sort((left, right) => right.priority - left.priority || right.id - left.id)
    .filter((candidate) =>
      doesPlacementRuleMatch({
        context: input.context,
        rule: candidate.matchingRule,
      }),
    );
}
