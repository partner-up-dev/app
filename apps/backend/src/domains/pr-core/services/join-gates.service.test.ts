import assert from "node:assert/strict";
import { test } from "vitest";
import type { AnchorEvent, PRJoinGateConfig } from "../../../entities";
import { emptyAnchorEventTimePoolConfig } from "../../../entities";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const eventGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "shared-notice",
  version: "v1",
  title: "Event notice",
  source: "ANCHOR_EVENT",
  body: "Read event notice",
};

const prGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "pr-notice",
  version: "v1",
  title: "PR notice",
  source: "PR",
  body: "Read PR notice",
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

test("buildMaterializedPRJoinGateConfig merges event and PR join-notice gates", async () => {
  const { buildMaterializedPRJoinGateConfig } = await import(
    "./join-gates.service"
  );

  const gates = buildMaterializedPRJoinGateConfig({
    event: buildEvent(),
    prGates: [prGate],
  });

  assert.deepEqual(
    gates.map((gate) => `${gate.source}:${gate.key}`),
    ["ANCHOR_EVENT:shared-notice", "PR:pr-notice"],
  );
});

test("buildMaterializedPRJoinGateConfig dedupes by kind, source, and key", async () => {
  const { buildMaterializedPRJoinGateConfig } = await import(
    "./join-gates.service"
  );

  const gates = buildMaterializedPRJoinGateConfig({
    event: buildEvent({
      joinGateConfig: [eventGate, { ...eventGate, title: "Updated" }],
    }),
  });

  assert.equal(gates.length, 1);
  assert.equal(gates[0]?.title, "Updated");
});
