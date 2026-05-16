import assert from "node:assert/strict";
import { test } from "vitest";
import type {
  AnchorEvent,
  AnchorEventSupportResource,
  PRJoinGateConfig,
} from "../../../entities";
import { emptyAnchorEventTimePoolConfig } from "../../../entities";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const timeWindow: [string, string] = [
  "2031-01-01T10:00:00.000Z",
  "2031-01-01T12:00:00.000Z",
];

const eventGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "event-notice",
  version: "v1",
  title: "Event notice",
  source: "ANCHOR_EVENT",
  body: "Read event notice",
};

const resourceGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "resource-notice",
  version: "v1",
  title: "Resource notice",
  source: "PR_SUPPORT_RESOURCE",
  body: "Read resource notice",
};

const buildEvent = (
  overrides: Partial<AnchorEvent> = {},
): AnchorEvent => ({
  id: 1,
  title: "Scenario event",
  type: "badminton",
  description: null,
  locationPool: [],
  routePool: [],
  timePoolConfig: emptyAnchorEventTimePoolConfig(),
  defaultMinPartners: null,
  defaultMaxPartners: null,
  defaultPrNotes: null,
  defaultConfirmationEnabled: true,
  defaultConfirmationStartOffsetMinutes: null,
  defaultConfirmationEndOffsetMinutes: null,
  defaultJoinLockOffsetMinutes: null,
  meetingPoint: null,
  joinGateConfig: [eventGate],
  participationFrequencyLimit: null,
  feedbackQuestionnaireTemplateId: null,
  locationMeetingPoints: {},
  coverImage: null,
  betaGroupQrCode: null,
  prCreationPolicy: "USER_AND_ADMIN",
  fullPrExpansionPolicy: "DISABLED",
  status: "ACTIVE",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const buildResource = (
  overrides: Partial<AnchorEventSupportResource> = {},
): AnchorEventSupportResource => ({
  id: 1,
  anchorEventId: 1,
  code: "resource",
  title: "Scenario resource",
  resourceKind: "VENUE",
  appliesToAllLocations: true,
  locationIds: [],
  bookingRequired: false,
  bookingHandledBy: null,
  bookingDeadlineRule: null,
  bookingLocksParticipant: false,
  cancellationPolicy: null,
  settlementMode: "NONE",
  subsidyRate: null,
  subsidyCap: null,
  requiresUserTransferToPlatform: false,
  summaryText: "Scenario support resource",
  detailRules: [],
  joinGateConfig: [resourceGate],
  displayOrder: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

test("buildMaterializedPRJoinGateConfig keeps all-location support-resource gates when PR location is null", async () => {
  const { buildMaterializedPRJoinGateConfig } = await import(
    "./join-gates.service"
  );

  const gates = buildMaterializedPRJoinGateConfig({
    event: buildEvent(),
    resources: [buildResource()],
    location: null,
    timeWindow,
  });

  assert.deepEqual(
    gates.map((gate) => gate.key),
    ["event-notice", "resource-notice"],
  );
});

test("buildMaterializedPRJoinGateConfig skips scoped support-resource gates when PR location is null", async () => {
  const { buildMaterializedPRJoinGateConfig } = await import(
    "./join-gates.service"
  );

  const gates = buildMaterializedPRJoinGateConfig({
    event: buildEvent(),
    resources: [
      buildResource({
        appliesToAllLocations: false,
        locationIds: ["Court A"],
      }),
    ],
    location: null,
    timeWindow,
  });

  assert.deepEqual(
    gates.map((gate) => gate.key),
    ["event-notice"],
  );
});

test("buildMaterializedPRJoinGateConfig includes support-resource gates when PR location matches", async () => {
  const { buildMaterializedPRJoinGateConfig } = await import(
    "./join-gates.service"
  );

  const gates = buildMaterializedPRJoinGateConfig({
    event: buildEvent(),
    resources: [buildResource()],
    location: "Court A",
    timeWindow,
  });

  assert.deepEqual(
    gates.map((gate) => gate.key),
    ["event-notice", "resource-notice"],
  );
});
