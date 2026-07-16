import assert from "node:assert/strict";
import { test } from "vitest";
import type { PRTypeConfig } from "../../../entities/pr-type-config";
import { toAdminPRTypeConfigDetail } from "./projection";

test("projection keeps each PR type config field under its owning slice", () => {
  const config = {
    type: "study",
    title: "Study",
    description: "A focused session",
    locationPool: ["Library"],
    routePool: [],
    timePoolConfig: { durationMinutes: 90, earliestLeadMinutes: 30, startRules: [] },
    authoringTimeWindowEditorDefaultMode: "NORMAL",
    defaultMinPartners: 2,
    defaultMaxPartners: 4,
    defaultNotes: "Bring notes",
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes: 120,
    defaultConfirmationEndOffsetMinutes: 30,
    defaultJoinLockOffsetMinutes: 30,
    meetingPoint: null,
    joinGateConfig: [],
    participationFrequencyLimit: null,
    feedbackQuestionnaireTemplateId: null,
    locationMeetingPoints: {},
    coverImage: null,
    communityQrCode: null,
    authoringCreationPolicy: "USER_AND_ADMIN",
    fullCapacityExpansionPolicy: "DISABLED",
    discoveryFormRatio: 50,
    discoveryCardRatio: 50,
    discoveryListRatio: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  } as PRTypeConfig;

  const result = toAdminPRTypeConfigDetail(config);
  assert.equal(result.type, "study");
  assert.equal(result.authoring.defaultNotes, "Bring notes");
  assert.deepEqual(result.discovery.viewRatios, { FORM: 50, CARD: 50, LIST: 0 });
  assert.equal(result.participation.fullCapacityExpansionPolicy, "DISABLED");
  assert.deepEqual(result.coordination, { meetingPoint: null, locationMeetingPoints: {} });
  assert.equal(result.completion.feedbackQuestionnaireTemplateId, null);
  assert.equal("createdAt" in result, false);
  assert.equal("updatedAt" in result, false);
});
