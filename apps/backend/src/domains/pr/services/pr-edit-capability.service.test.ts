import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { PartnerRequest, PartnerRequestFields } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  assertPRContentEditable,
  buildPREditCapability,
  buildPREditPostReadyCapability,
  resolveChangedPRContentFields,
} from "./pr-edit-capability.service";

const creatorUserId = "11111111-1111-4111-8111-111111111111" satisfies UserId;

const buildRequest = (overrides: Partial<PartnerRequest> = {}): PartnerRequest => ({
  id: 1,
  title: "Badminton",
  type: "羽毛球",
  time: ["2026-06-02T09:00:00.000Z", "2026-06-02T11:00:00.000Z"],
  location: "Court A",
  route: null,
  status: "READY",
  visibilityStatus: "VISIBLE",
  confirmationEnabled: true,
  confirmationStartOffsetMinutes: null,
  confirmationEndOffsetMinutes: null,
  joinLockOffsetMinutes: null,
  minPartners: 2,
  maxPartners: null,
  budget: null,
  createdAt: new Date("2026-06-01T00:00:00.000Z"),
  preferences: [],
  notes: null,
  meetingPoint: null,
  allowEditAfterReady: {
    timeWindow: ["2026-06-02T08:00:00.000Z", "2026-06-02T12:00:00.000Z"],
  },
  joinGateConfig: [],
  orders: [],
  feedbackQuestionnaireInstanceId: null,
  createdBy: creatorUserId,
  xiaohongshuPoster: null,
  wechatThumbnail: null,
  ...overrides,
});

const toFields = (request: PartnerRequest): PartnerRequestFields => ({
  title: request.title ?? undefined,
  type: request.type,
  time: request.time,
  location: request.location,
  route: request.route,
  minPartners: request.minPartners,
  maxPartners: request.maxPartners,
  partners: [],
  budget: request.budget,
  preferences: request.preferences,
  notes: request.notes,
  meetingPoint: request.meetingPoint,
});

describe("PR edit capability", () => {
  it("exposes READY-after time edit only to the creator", () => {
    const request = buildRequest();

    assert.deepEqual(buildPREditCapability(request, creatorUserId), {
      canEdit: true,
      editableFields: ["time"],
      constraints: {
        timeWindow: ["2026-06-02T08:00:00.000Z", "2026-06-02T12:00:00.000Z"],
      },
    });
    assert.equal(buildPREditCapability(request, null).canEdit, false);
  });

  it("exposes post-ready adjustment fields independently from viewer identity", () => {
    const request = buildRequest({
      allowEditAfterReady: {
        timeWindow: ["2026-06-02T08:00:00.000Z", "2026-06-02T12:00:00.000Z"],
        location: true,
      },
    });

    assert.deepEqual(buildPREditPostReadyCapability(request.allowEditAfterReady), {
      editableFields: ["time", "location"],
      constraints: {
        timeWindow: ["2026-06-02T08:00:00.000Z", "2026-06-02T12:00:00.000Z"],
      },
    });
  });

  it("allows READY time edits inside the configured range", () => {
    const request = buildRequest();
    const fields = {
      ...toFields(request),
      time: ["2026-06-02T10:00:00.000Z", "2026-06-02T11:00:00.000Z"],
    } satisfies PartnerRequestFields;

    assert.doesNotThrow(() =>
      assertPRContentEditable({
        request,
        fields,
        changedFields: resolveChangedPRContentFields(request, fields),
      }),
    );
  });

  it("rejects READY edits for fields absent from allowEditAfterReady", () => {
    const request = buildRequest();
    const fields = {
      ...toFields(request),
      location: "Court B",
    } satisfies PartnerRequestFields;

    assert.throws(() =>
      assertPRContentEditable({
        request,
        fields,
        changedFields: resolveChangedPRContentFields(request, fields),
      }),
    );
  });

  it("rejects READY time edits outside the configured range", () => {
    const request = buildRequest();
    const fields = {
      ...toFields(request),
      time: ["2026-06-02T07:00:00.000Z", "2026-06-02T08:30:00.000Z"],
    } satisfies PartnerRequestFields;

    assert.throws(() =>
      assertPRContentEditable({
        request,
        fields,
        changedFields: resolveChangedPRContentFields(request, fields),
      }),
    );
  });
});
