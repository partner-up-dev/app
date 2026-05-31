import { describe, expect, it } from "vitest";
import {
  resolvePrRentalPlacementBindings,
  validatePlacementBindingRules,
} from "./placement-binding";
import type { PrPlacementRuleContextData } from "./placement-pr-context";

const context: PrPlacementRuleContextData = {
  activeParticipantCount: 3,
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

describe("placement binding rules", () => {
  it("resolves PR values for Rental ordering locked fields", () => {
    expect(
      resolvePrRentalPlacementBindings({
        context,
        rules: [
          {
            fieldKey: "participantCount",
            contextPath: "activeParticipantCount",
            lock: true,
          },
          {
            fieldKey: "serviceStartAt",
            contextPath: "time.startAt",
            lock: true,
          },
          {
            fieldKey: "serviceEndAt",
            contextPath: "time.endAt",
            lock: true,
          },
        ],
      }),
    ).toEqual({
      participantCount: 3,
      serviceStartAt: "2031-01-01T10:00:00.000Z",
      serviceEndAt: "2031-01-01T12:00:00.000Z",
    });
  });

  it("rejects mismatched field and context path", () => {
    expect(
      validatePlacementBindingRules([
        {
          fieldKey: "participantCount",
          contextPath: "time.startAt",
          lock: true,
        },
      ]),
    ).toBe("Placement binding field participantCount cannot bind from time.startAt");
  });

  it("requires all current Rental locked fields", () => {
    expect(() =>
      resolvePrRentalPlacementBindings({
        context,
        rules: [
          {
            fieldKey: "participantCount",
            contextPath: "activeParticipantCount",
            lock: true,
          },
        ],
      }),
    ).toThrow("Placement binding rules must bind participant count and service time");
  });
});
