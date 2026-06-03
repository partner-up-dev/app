import { describe, expect, test } from "vitest";
import type { PlacementSelectionCandidate } from "./placement-selection";
import {
  isPlacementActiveAt,
  listMatchingPlacementCandidates,
} from "./placement-selection";
import type { PrPlacementRuleContextData } from "./placement-pr-context";

const prContext: PrPlacementRuleContextData = {
  activeParticipantCount: 2,
  budget: null,
  hasLocation: true,
  hasRoute: false,
  kind: "PR",
  location: "Scenario Court",
  maxPartners: null,
  minPartners: 2,
  notes: null,
  prId: 231,
  preferences: [],
  route: null,
  routePointCount: 0,
  status: "READY",
  time: {
    endAt: "2031-01-01T12:00:00.000Z",
    hasConcreteTime: true,
    hasEnd: true,
    hasStart: true,
    startAt: "2031-01-01T10:00:00.000Z",
  },
  title: "System rental PR",
  type: "cooking",
};

describe("listMatchingPlacementCandidates", () => {
  test("filters by matchingRule and chooses higher priority before id", () => {
    const candidates: PlacementSelectionCandidate[] = [
      {
        id: 1,
        matchingRule: { "===": [{ var: "type" }, "ride-hailing"] },
        priority: 1000,
      },
      {
        id: 2,
        matchingRule: { "===": [{ var: "type" }, "cooking"] },
        priority: 10,
      },
      {
        id: 3,
        matchingRule: { "===": [{ var: "activeParticipantCount" }, 2] },
        priority: 20,
      },
    ];

    expect(
      listMatchingPlacementCandidates({
        candidates,
        context: prContext,
      }).map((candidate) => candidate.id),
    ).toEqual([3, 2]);
  });
});

describe("isPlacementActiveAt", () => {
  test("honors nullable, future, and expired active windows", () => {
    const now = new Date("2031-01-01T10:00:00.000Z");

    expect(
      isPlacementActiveAt(
        {
          status: "ACTIVE",
          effectiveFrom: null,
          effectiveTo: null,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isPlacementActiveAt(
        {
          status: "ACTIVE",
          effectiveFrom: new Date("2031-01-01T11:00:00.000Z"),
          effectiveTo: null,
        },
        now,
      ),
    ).toBe(false);
    expect(
      isPlacementActiveAt(
        {
          status: "ACTIVE",
          effectiveFrom: null,
          effectiveTo: new Date("2031-01-01T10:00:00.000Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});
