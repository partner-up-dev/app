import { describe, expect, it } from "vitest";
import {
  resolvePlacementBindings,
  validatePlacementBindingRulesAgainstContract,
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
  it("resolves generic context paths into bound fields", () => {
    expect(
      resolvePlacementBindings({
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

  it("accepts generic field and context paths", () => {
    expect(
      validatePlacementBindingRules([
        {
          fieldKey: "originName",
          contextPath: "route.0.name",
          lock: true,
        },
      ]),
    ).toBeNull();
  });

  it("validates required fields against a definition-time contract", () => {
    expect(
      validatePlacementBindingRulesAgainstContract({
        contract: {
          requiredFieldKeys: [
            "participantCount",
            "serviceStartAt",
            "serviceEndAt",
          ],
        },
        rules: [
          {
            fieldKey: "participantCount",
            contextPath: "activeParticipantCount",
            lock: true,
          },
        ],
      }),
    ).toBe("Placement binding rules must bind required field: serviceStartAt");
  });
});
