import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { NewPRTypeConfig, PRTypeConfig } from "../../entities/pr-type-config";
import type { PRRoute } from "../pr/contracts/partner-request";

type PRTypeConfigPatch = Partial<Omit<NewPRTypeConfig, "type" | "createdAt" | "updatedAt">>;

const repository = vi.hoisted(() => ({
  create: vi.fn<() => Promise<PRTypeConfig>>(),
  findByType: vi.fn<() => Promise<PRTypeConfig | null>>(),
  findByNormalizedType: vi.fn<() => Promise<PRTypeConfig | null>>(),
  updateByType: vi.fn<(type: string, patch: PRTypeConfigPatch) => Promise<PRTypeConfig | null>>(),
}));
const poi = vi.hoisted(() => ({
  findByNames: vi.fn<() => Promise<Array<{ name: string }>>>(),
}));
const feedback = vi.hoisted(() => ({
  findTemplate: vi.fn<() => Promise<{ id: number } | null>>(),
}));

vi.mock("../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    create = repository.create;
    findByType = repository.findByType;
    findByNormalizedType = repository.findByNormalizedType;
    updateByType = repository.updateByType;
  },
}));
vi.mock("../poi/queries", () => ({ findPoisByNames: poi.findByNames }));
vi.mock("../feedback-questionnaire/queries", () => ({
  findFeedbackQuestionnaireTemplate: feedback.findTemplate,
}));

const { appendPRTypeConfigRoute, createPRTypeConfig, updatePRTypeConfigAuthoring } =
  await import("./commands");

const config: PRTypeConfig = {
  type: "study",
  title: "Study",
  description: null,
  locationPool: ["Library"],
  routePool: [],
  timePoolConfig: { durationMinutes: 90, earliestLeadMinutes: null, startRules: [] },
  authoringTimeWindowEditorDefaultMode: "NORMAL",
  defaultMinPartners: 2,
  defaultMaxPartners: 4,
  defaultNotes: null,
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
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  repository.findByType.mockResolvedValue(config);
  repository.findByNormalizedType.mockResolvedValue(null);
  repository.create.mockResolvedValue(config);
  repository.updateByType.mockImplementation(async (_type, patch) => ({ ...config, ...patch }));
  poi.findByNames.mockResolvedValue([{ name: "Library" }]);
  feedback.findTemplate.mockResolvedValue({ id: 1 });
});

test("operator create rejects a case-insensitive duplicate before writing", async () => {
  repository.findByNormalizedType.mockResolvedValue({ ...config, type: "Study" });

  await assert.rejects(
    createPRTypeConfig({
      type: " study ",
      authoring: {
        locationPool: ["Library"],
        routePool: [],
        timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
        timeWindowEditorDefaultMode: "NORMAL",
        defaultMinPartners: 2,
        defaultMaxPartners: 4,
        defaultNotes: null,
        authoringCreationPolicy: "USER_AND_ADMIN",
      },
      discovery: {
        title: "Study",
        description: null,
        coverImage: null,
        communityQrCode: null,
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
      coordination: { meetingPoint: null, locationMeetingPoints: {} },
      completion: { feedbackQuestionnaireTemplateId: null },
    }),
    /already exists/,
  );
  assert.equal(repository.create.mock.calls.length, 0);
});

test("authoring command validates the place pool and writes only owner fields", async () => {
  await updatePRTypeConfigAuthoring("study", {
    locationPool: [" Library "],
    routePool: [],
    timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
    timeWindowEditorDefaultMode: "NORMAL",
    defaultMinPartners: 2,
    defaultMaxPartners: 5,
    defaultNotes: " Notes ",
    authoringCreationPolicy: "ADMIN_ONLY",
  });

  assert.deepEqual(repository.updateByType.mock.calls[0], [
    "study",
    {
      locationPool: ["Library"],
      routePool: [],
      timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
      authoringTimeWindowEditorDefaultMode: "NORMAL",
      defaultMinPartners: 2,
      defaultMaxPartners: 5,
      defaultNotes: "Notes",
      authoringCreationPolicy: "ADMIN_ONLY",
    },
  ]);
});

test("route append owns generated entry ids and leaves a duplicate route untouched", async () => {
  const route: PRRoute = [
    { name: "A", full_address: null, wgs84: null, bd09: null, gcj02: [1, 1] },
    { name: "B", full_address: null, wgs84: null, bd09: null, gcj02: [2, 2] },
  ];
  repository.findByType.mockResolvedValue({ ...config, locationPool: [], routePool: [] });

  assert.deepEqual(await appendPRTypeConfigRoute({ type: "study", applicationId: 12, route }), {
    kind: "APPENDED",
  });
  assert.deepEqual(repository.updateByType.mock.calls[0]?.[1], {
    routePool: [{ id: "application-12", route }],
  });

  repository.updateByType.mockClear();
  repository.findByType.mockResolvedValue({
    ...config,
    locationPool: [],
    routePool: [{ id: "existing", route }],
  });
  assert.deepEqual(await appendPRTypeConfigRoute({ type: "study", applicationId: 12, route }), {
    kind: "ALREADY_PRESENT",
  });
  assert.equal(repository.updateByType.mock.calls.length, 0);
});
