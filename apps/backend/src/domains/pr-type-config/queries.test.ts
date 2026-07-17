import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PRTypeConfig } from "../../entities/pr-type-config";

const repository = vi.hoisted(() => ({
  findByType: vi.fn<() => Promise<PRTypeConfig | null>>(),
  listAll: vi.fn<() => Promise<PRTypeConfig[]>>(),
}));

vi.mock("../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    findByType = repository.findByType;
    listAll = repository.listAll;
  },
}));

const {
  getPRTypeConfigCreationDefaults,
  getPRTypeConfigDiscoveryPolicy,
  listPRTypeConfigDiscoveryCatalogPolicies,
  listPRTypeConfigOperatorDetails,
} = await import("./queries");

const config: PRTypeConfig = {
  type: "study",
  title: "Study group",
  description: "Current discovery description",
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
  feedbackQuestionnaireTemplateId: 3,
  locationMeetingPoints: {},
  coverImage: "cover.png",
  communityQrCode: "qr.png",
  authoringCreationPolicy: "USER_AND_ADMIN",
  fullCapacityExpansionPolicy: "DISABLED",
  discoveryFormRatio: 50,
  discoveryCardRatio: 50,
  discoveryListRatio: 0,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  repository.findByType.mockResolvedValue(config);
  repository.listAll.mockResolvedValue([config]);
});

test("discovery catalog performs one set read and excludes detail-only policy", async () => {
  const [catalog] = await listPRTypeConfigDiscoveryCatalogPolicies();

  assert.deepEqual(catalog, {
    type: "study",
    title: "Study group",
    description: "Current discovery description",
    coverImage: "cover.png",
    locationPool: ["Library"],
    routePool: [],
  });
  assert.equal(repository.listAll.mock.calls.length, 1);
  assert.equal("communityQrCode" in (catalog ?? {}), false);
  assert.equal("createdAt" in (catalog ?? {}), false);
});

test("named reads return null for missing policy and do not expose persistence timestamps", async () => {
  repository.findByType.mockResolvedValueOnce(null);
  assert.equal(await getPRTypeConfigDiscoveryPolicy("missing"), null);

  const defaults = await getPRTypeConfigCreationDefaults("study");
  assert.deepEqual(defaults, {
    defaultNotes: "Bring notes",
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes: 120,
    defaultConfirmationEndOffsetMinutes: 30,
    defaultJoinLockOffsetMinutes: 30,
    joinGateConfig: [],
    feedbackQuestionnaireTemplateId: 3,
  });
  assert.equal("createdAt" in (defaults ?? {}), false);
  assert.equal("locationPool" in (defaults ?? {}), false);
});

test("operator projection is explicit and remains separate from public policy reads", async () => {
  const [operator] = await listPRTypeConfigOperatorDetails();

  assert.equal(operator?.authoring.locationPool[0], "Library");
  assert.equal(operator?.discovery.communityQrCode, "qr.png");
  assert.equal(operator?.participation.defaultConfirmationEnabled, true);
  assert.equal("createdAt" in (operator ?? {}), false);
  assert.equal("timePoolConfig" in (operator ?? {}), false);
});
