import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { ActiveParticipantSummary } from "../../../repositories/PartnerRepository";
import type { PublicPR } from "../../pr/read-models/public-pr-view.service";
import type { ResolvedAnchorParticipationPolicy } from "./anchor-participation-policy.service";
import { buildPRPartnerSection } from "./partner-section-view.service";

const viewerUserId =
  "11111111-1111-4111-8111-111111111111" satisfies UserId;

const buildPublicPR = (
  overrides: Partial<PublicPR> = {},
): PublicPR => {
  const now = new Date("2026-05-10T12:00:00.000Z");
  const request = {
    id: 189,
    title: "Food tasting",
    type: "餐饮试吃",
    time: ["2020-01-01T12:00:00.000Z", "2020-01-01T13:00:00.000Z"],
    location: "Test POI",
    route: null,
    status: "ACTIVE",
    visibilityStatus: "VISIBLE",
    confirmationEnabled: true,
    confirmationStartOffsetMinutes: 120,
    confirmationEndOffsetMinutes: 30,
    joinLockOffsetMinutes: 30,
    minPartners: 1,
    maxPartners: 2,
    budget: null,
    createdAt: now,
    preferences: [],
    notes: null,
    meetingPoint: null,
    joinGateConfig: [],
    feedbackQuestionnaireInstanceId: null,
    createdBy: null,
    xiaohongshuPoster: null,
    wechatThumbnail: null,
  } satisfies PartnerRequest;

  return {
    ...request,
    partners: [1],
    myPartnerId: 1,
    myPendingPartnerId: null,
    isViewerWaitlisted: false,
    isViewerReleased: false,
    ...overrides,
  };
};

const buildPolicy = (): ResolvedAnchorParticipationPolicy => ({
  confirmationEnabled: true,
  confirmationStartOffsetMinutes: 120,
  confirmationEndOffsetMinutes: 30,
  joinLockOffsetMinutes: 30,
  confirmationStartAt: new Date("2020-01-01T10:00:00.000Z"),
  confirmationEndAt: new Date("2020-01-01T11:30:00.000Z"),
  joinLockAt: new Date("2020-01-01T11:30:00.000Z"),
});

const buildActiveParticipant = (
  status: ActiveParticipantSummary["status"],
): ActiveParticipantSummary => ({
  partnerId: 1,
  status,
  userId: viewerUserId,
  nickname: null,
  avatar: null,
  phoneNumber: null,
});

describe("buildPRPartnerSection", () => {
  it("does not allow an attended participant to check in again", () => {
    const participant = buildActiveParticipant("ATTENDED");
    const view = buildPRPartnerSection({
      publicPR: buildPublicPR(),
      activeParticipants: [participant],
      rosterParticipants: [participant],
      viewerUserId,
      policy: buildPolicy(),
    });

    assert.equal(view.viewer.slotState, "ATTENDED");
    assert.equal(view.viewer.canCheckIn, false);
  });

  it("allows a confirmed participant to check in after the event starts", () => {
    const participant = buildActiveParticipant("CONFIRMED");
    const view = buildPRPartnerSection({
      publicPR: buildPublicPR(),
      activeParticipants: [participant],
      rosterParticipants: [participant],
      viewerUserId,
      policy: buildPolicy(),
    });

    assert.equal(view.viewer.slotState, "CONFIRMED");
    assert.equal(view.viewer.canCheckIn, true);
  });

  it("keeps check-in available while confirmation is disabled", () => {
    const participant = buildActiveParticipant("JOINED");
    const view = buildPRPartnerSection({
      publicPR: buildPublicPR({ confirmationEnabled: false }),
      activeParticipants: [participant],
      rosterParticipants: [participant],
      viewerUserId,
      policy: {
        ...buildPolicy(),
        confirmationEnabled: false,
        confirmationStartAt: null,
        confirmationEndAt: null,
      },
    });

    assert.equal(view.confirmation.enabled, false);
    assert.equal(view.viewer.canConfirm, false);
    assert.equal(view.viewer.canCheckIn, true);
  });
});
