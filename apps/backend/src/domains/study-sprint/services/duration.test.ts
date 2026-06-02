import { describe, expect, test } from "vitest";
import type { PartnerRequest } from "../../../entities/partner-request";
import { deriveStudySprintDurationMinutes } from "./duration";

describe("deriveStudySprintDurationMinutes", () => {
  test("derives minutes from PR time window", () => {
    expect(
      deriveStudySprintDurationMinutes(
        buildPR({
          time: ["2026-06-02T10:00:00.000Z", "2026-06-02T10:45:00.000Z"],
        }),
      ),
    ).toBe(45);
  });

  test("falls back to 30 minutes when time window is missing or invalid", () => {
    expect(deriveStudySprintDurationMinutes(buildPR({ time: [null, null] }))).toBe(
      30,
    );
    expect(
      deriveStudySprintDurationMinutes(
        buildPR({
          time: ["2026-06-02T10:45:00.000Z", "2026-06-02T10:00:00.000Z"],
        }),
      ),
    ).toBe(30);
  });
});

const buildPR = (input: {
  time: [string | null, string | null];
}): PartnerRequest =>
  ({
    id: 1,
    title: "自习搭子",
    type: "STUDY_SPRINT",
    time: input.time,
    location: null,
    route: null,
    status: "ACTIVE",
    visibilityStatus: "VISIBLE",
    confirmationEnabled: true,
    confirmationStartOffsetMinutes: null,
    confirmationEndOffsetMinutes: null,
    joinLockOffsetMinutes: null,
    minPartners: null,
    maxPartners: null,
    budget: null,
    createdAt: new Date(),
    preferences: [],
    notes: null,
    meetingPoint: null,
    allowEditAfterReady: null,
    joinGateConfig: [],
    orders: [],
    feedbackQuestionnaireInstanceId: null,
    createdBy: null,
    xiaohongshuPoster: null,
    wechatThumbnail: null,
  }) satisfies PartnerRequest;
