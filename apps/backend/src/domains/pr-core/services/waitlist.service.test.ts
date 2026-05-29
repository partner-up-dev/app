import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PartnerRequest } from "../../../entities/partner-request";

const buildRequest = (
  overrides: Partial<PartnerRequest> = {},
): PartnerRequest => ({
  id: 1,
  title: "Test PR",
  type: "test",
  time: ["2026-05-24T10:00:00.000Z", "2026-05-24T11:00:00.000Z"],
  location: "Test Location",
  route: null,
  status: "OPEN",
  visibilityStatus: "VISIBLE",
  minPartners: 1,
  maxPartners: 2,
  budget: null,
  preferences: [],
  notes: null,
  meetingPoint: null,
  joinGateConfig: [],
  confirmationEnabled: false,
  confirmationStartOffsetMinutes: null,
  confirmationEndOffsetMinutes: null,
  joinLockOffsetMinutes: null,
  feedbackQuestionnaireInstanceId: null,
  createdBy: null,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  xiaohongshuPoster: null,
  wechatThumbnail: null,
  ...overrides,
});

describe("isWaitlistOpenForRequest", () => {
  it("opens waitlist for READY even when the roster is below max", async () => {
    process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
    const { isWaitlistOpenForRequest } = await import("./waitlist.service");

    assert.equal(
      isWaitlistOpenForRequest({
        request: buildRequest({ status: "READY", maxPartners: 4 }),
        activeCount: 2,
      }),
      true,
    );
  });

  it("opens waitlist for an OPEN request only when capacity is full", async () => {
    process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
    const { isWaitlistOpenForRequest } = await import("./waitlist.service");

    assert.equal(
      isWaitlistOpenForRequest({
        request: buildRequest({ status: "OPEN", maxPartners: 2 }),
        activeCount: 2,
      }),
      true,
    );
    assert.equal(
      isWaitlistOpenForRequest({
        request: buildRequest({ status: "OPEN", maxPartners: 2 }),
        activeCount: 1,
      }),
      false,
    );
  });
});
