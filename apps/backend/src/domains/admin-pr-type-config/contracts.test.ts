import assert from "node:assert/strict";
import { test } from "vitest";
import {
  adminPRTypeConfigAuthoringSchema,
  adminPRTypeConfigCreateSchema,
  adminPRTypeConfigParticipationSchema,
  adminPRTypePreferenceTagModerationSchema,
} from "./contracts";
import { prTypeConfigAuthoringSchema } from "../pr-type-config/contracts";

test("admin routes reuse the PR Type Config owner's core contract", () => {
  assert.equal(adminPRTypeConfigAuthoringSchema, prTypeConfigAuthoringSchema);
});

test("owner slice contracts reject metadata and unrelated owner fields", () => {
  const authoring = adminPRTypeConfigAuthoringSchema.safeParse({
    locationPool: [],
    routePool: [],
    timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
    defaultMinPartners: null,
    defaultMaxPartners: null,
    defaultNotes: null,
    authoringCreationPolicy: "USER_AND_ADMIN",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(authoring.success, false);

  const participation = adminPRTypeConfigParticipationSchema.safeParse({
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes: 30,
    defaultConfirmationEndOffsetMinutes: 30,
    defaultJoinLockOffsetMinutes: 10,
    joinGateConfig: [],
    participationFrequencyLimit: null,
    fullCapacityExpansionPolicy: "DISABLED",
  });
  assert.equal(participation.success, false);
});

test("admin PR type config input is owner-sliced and rejects lifecycle-shaped fields", () => {
  const result = adminPRTypeConfigCreateSchema.safeParse({
    type: "study",
    authoring: {
      locationPool: [],
      routePool: [],
      timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
      defaultMinPartners: null,
      defaultMaxPartners: null,
      defaultNotes: null,
      authoringCreationPolicy: "USER_AND_ADMIN",
    },
    discovery: {
      title: "Study",
      description: null,
      coverImage: null,
      viewRatios: { FORM: 50, CARD: 50, LIST: 0 },
    },
    participation: {
      defaultConfirmationEnabled: true,
      defaultConfirmationStartOffsetMinutes: 120,
      defaultConfirmationEndOffsetMinutes: 30,
      defaultJoinLockOffsetMinutes: 30,
      joinGateConfig: [],
      participationFrequencyLimit: null,
      fullCapacityExpansionPolicy: "DISABLED",
    },
    coordination: {
      meetingPoint: null,
      locationMeetingPoints: {},
    },
    completion: { feedbackQuestionnaireTemplateId: null },
    status: "ACTIVE",
  });

  assert.equal(result.success, false);
  assert.equal(
    adminPRTypePreferenceTagModerationSchema.safeParse({ moderationStatus: "PUBLISHED" }).success,
    true,
  );
});

test("admin PR type config input enforces partner and confirmation bounds", () => {
  const base = {
    type: "study",
    authoring: {
      locationPool: [],
      routePool: [],
      timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
      defaultMinPartners: 3,
      defaultMaxPartners: 2,
      defaultNotes: null,
      authoringCreationPolicy: "USER_AND_ADMIN" as const,
    },
    discovery: {
      title: "Study",
      description: null,
      coverImage: null,
      viewRatios: { FORM: 50, CARD: 50, LIST: 0 },
    },
    participation: {
      defaultConfirmationEnabled: true,
      defaultConfirmationStartOffsetMinutes: 30,
      defaultConfirmationEndOffsetMinutes: 30,
      defaultJoinLockOffsetMinutes: 10,
      joinGateConfig: [],
      participationFrequencyLimit: null,
      fullCapacityExpansionPolicy: "DISABLED" as const,
    },
    coordination: { meetingPoint: null, locationMeetingPoints: {} },
    completion: { feedbackQuestionnaireTemplateId: null },
  };

  assert.equal(adminPRTypeConfigCreateSchema.safeParse(base).success, false);
});

test("authoring config rejects ambiguous or duplicate place pools at the API boundary", () => {
  const base = {
    routePool: [],
    timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
    defaultMinPartners: 2,
    defaultMaxPartners: null,
    defaultNotes: null,
    authoringCreationPolicy: "USER_AND_ADMIN" as const,
  };
  assert.equal(
    adminPRTypeConfigAuthoringSchema.safeParse({
      ...base,
      locationPool: ["Library", "Library"],
    }).success,
    false,
  );
  assert.equal(
    adminPRTypeConfigAuthoringSchema.safeParse({
      ...base,
      locationPool: ["Library"],
      routePool: [
        {
          id: "route",
          route: [
            { name: "A", full_address: "A", wgs84: null, gcj02: null, bd09: null },
            { name: "B", full_address: "B", wgs84: null, gcj02: null, bd09: null },
          ],
        },
      ],
    }).success,
    false,
  );
});
