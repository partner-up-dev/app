import { describe, expect, test } from "vitest";
import { buildPrPlacementRuleContextData } from "./placement-pr-context";
import { doesPlacementRuleMatch } from "./placement-rule-engine";
import type { PartnerRequest } from "../../../entities/partner-request";

const prBase: PartnerRequest = {
  budget: null,
  confirmationEnabled: true,
  confirmationEndOffsetMinutes: null,
  confirmationStartOffsetMinutes: null,
  createdAt: new Date("2031-01-01T00:00:00.000Z"),
  createdBy: null,
  feedbackQuestionnaireInstanceId: null,
  id: 231,
  joinGateConfig: [],
  joinLockOffsetMinutes: null,
  location: "Scenario Court",
  maxPartners: null,
  meetingPoint: null,
  minPartners: 2,
  notes: null,
  preferences: ["quiet"],
  route: null,
  status: "OPEN",
  time: ["2031-01-01T10:00:00.000Z", "2031-01-01T12:00:00.000Z"],
  title: "Cooking court booking",
  type: "cooking",
  visibilityStatus: "VISIBLE",
  wechatThumbnail: null,
  xiaohongshuPoster: null,
};

describe("PlacementRuleEngine", () => {
  test("evaluates JSONLogic against PR context data", () => {
    const context = buildPrPlacementRuleContextData({
      activeParticipantCount: 2,
      pr: prBase,
    });

    expect(
      doesPlacementRuleMatch({
        context,
        rule: {
          and: [
            { "===": [{ var: "kind" }, "PR"] },
            { "===": [{ var: "type" }, "cooking"] },
            { ">=": [{ var: "activeParticipantCount" }, 2] },
            { var: "time.hasConcreteTime" },
          ],
        },
      }),
    ).toBe(true);

    expect(
      doesPlacementRuleMatch({
        context,
        rule: { "===": [{ var: "type" }, "ride-hailing"] },
      }),
    ).toBe(false);
  });

  test("rejects legacy plain objects that are not JSONLogic rules", () => {
    const context = buildPrPlacementRuleContextData({
      activeParticipantCount: 2,
      pr: prBase,
    });

    expect(
      doesPlacementRuleMatch({
        context,
        rule: {
          context: "PR",
          scenario: "legacy",
        },
      }),
    ).toBe(false);
  });
});
