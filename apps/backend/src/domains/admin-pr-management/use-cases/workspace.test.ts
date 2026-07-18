import assert from "node:assert/strict";
import { test, vi } from "vitest";
import type { PartnerRequest } from "../../../entities/partner-request";

vi.mock("../../pr/contracts", () => ({
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES: 30,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES: 120,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES: 30,
}));

vi.mock("../../pr/queries", () => ({
  countActivePartnersForPR: vi.fn<() => Promise<number>>(async () => 2),
  resolvePRPlaceDisplayName: vi.fn<() => string>(() => "Library"),
}));

vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    listAll = async () => [];
    findById = async () => null;
  },
}));
vi.mock("../../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    listAll = async () => [];
  },
}));
vi.mock("../../../repositories/FeedbackQuestionnaireRepository", () => ({
  FeedbackQuestionnaireRepository: class {
    listTemplates = async () => [];
    listInstances = async () => [];
  },
}));

const { toAdminPRSummary } = await import("./workspace");

test("PR admin summary is projected from PR-owned fields", async () => {
  const request = {
    id: 7,
    title: "Study together",
    type: "study",
    location: "Library",
    route: null,
    time: ["2026-07-16T10:00:00.000Z", "2026-07-16T11:00:00.000Z"],
    status: "OPEN",
    visibilityStatus: "VISIBLE",
    minPartners: 2,
    maxPartners: 4,
    preferences: ["quiet"],
    notes: null,
    meetingPoint: null,
    joinGateConfig: [],
    feedbackQuestionnaireInstanceId: null,
    confirmationEnabled: true,
    confirmationStartOffsetMinutes: 120,
    confirmationEndOffsetMinutes: 30,
    joinLockOffsetMinutes: 30,
    createdAt: new Date("2026-07-15T00:00:00.000Z"),
  } as unknown as PartnerRequest;

  const summary = await toAdminPRSummary(request);
  assert.equal(summary.prId, 7);
  assert.equal(summary.type, "study");
  assert.equal(summary.placeDisplayName, "Library");
  assert.equal(summary.partnerCount, 2);
  assert.equal(summary.visibilityStatus, "VISIBLE");
});
