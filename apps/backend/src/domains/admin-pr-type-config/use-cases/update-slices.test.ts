import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import type { PRTypeConfig } from "../../../entities/pr-type-config";

const repository = vi.hoisted(() => ({
  findByType: vi.fn<() => unknown>(),
  updateByType: vi.fn<(type: string, patch: Record<string, unknown>) => Promise<PRTypeConfig>>(),
}));
const coordination = vi.hoisted(() => ({
  update: vi.fn<() => Promise<PRTypeConfig>>(),
}));
const questionnaire = vi.hoisted(() => ({
  findTemplateById: vi.fn<() => unknown>(),
}));

vi.mock("../../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    findByType = repository.findByType;
    updateByType = repository.updateByType;
  },
}));
vi.mock("../../../repositories/PoiRepository", () => ({
  PoiRepository: class {
    findByNames = vi.fn<() => Promise<Array<{ name: string }>>>(async () => [{ name: "Library" }]);
  },
}));
vi.mock("../../../repositories/FeedbackQuestionnaireRepository", () => ({
  FeedbackQuestionnaireRepository: class {
    findTemplateById = questionnaire.findTemplateById;
  },
}));
vi.mock("./pr-type-coordination-meeting-point-transaction", () => ({
  createPRTypeCoordinationMeetingPointTransactionPort: () => ({
    update: coordination.update,
  }),
}));

import {
  updateAdminPRTypeConfigAuthoring,
  updateAdminPRTypeConfigCompletion,
  updateAdminPRTypeConfigCoordination,
  updateAdminPRTypeConfigDiscovery,
  updateAdminPRTypeConfigParticipation,
} from "./update-slices";

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

beforeEach(() => {
  vi.clearAllMocks();
  repository.findByType.mockResolvedValue(config);
  repository.updateByType.mockImplementation(async (_type, patch) => ({
    ...config,
    ...patch,
  }));
  coordination.update.mockResolvedValue(config);
  questionnaire.findTemplateById.mockResolvedValue({ id: 1 });
});

test("discovery slice update only writes discovery-owned columns", async () => {
  await updateAdminPRTypeConfigDiscovery("study", {
    title: "Deep Study",
    description: null,
    coverImage: null,
    communityQrCode: null,
    viewRatios: { FORM: 0, CARD: 100, LIST: 0 },
  });
  assert.deepEqual(repository.updateByType.mock.calls[0][1], {
    title: "Deep Study",
    description: null,
    coverImage: null,
    communityQrCode: null,
    discoveryFormRatio: 0,
    discoveryCardRatio: 100,
    discoveryListRatio: 0,
  });
});

test("authoring slice validates published place pool and only writes authoring columns", async () => {
  await updateAdminPRTypeConfigAuthoring("study", {
    locationPool: [" Library "],
    routePool: [],
    timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
    timeWindowEditorDefaultMode: "NORMAL",
    defaultMinPartners: 2,
    defaultMaxPartners: 5,
    defaultNotes: " Notes ",
    authoringCreationPolicy: "ADMIN_ONLY",
  });
  assert.deepEqual(repository.updateByType.mock.calls[0][1], {
    locationPool: ["Library"],
    routePool: [],
    timePoolConfig: { durationMinutes: null, earliestLeadMinutes: null, startRules: [] },
    authoringTimeWindowEditorDefaultMode: "NORMAL",
    defaultMinPartners: 2,
    defaultMaxPartners: 5,
    defaultNotes: "Notes",
    authoringCreationPolicy: "ADMIN_ONLY",
  });
});

test("participation slice only writes confirmation and gate policy columns", async () => {
  await updateAdminPRTypeConfigParticipation("study", {
    defaultConfirmationEnabled: true,
    defaultConfirmationStartOffsetMinutes: 120,
    defaultConfirmationEndOffsetMinutes: 30,
    defaultJoinLockOffsetMinutes: 30,
    joinGateConfig: [],
    participationFrequencyLimit: { intervalPrCount: 2 },
    fullCapacityExpansionPolicy: "ENABLED",
  });
  assert.deepEqual(Object.keys(repository.updateByType.mock.calls[0][1]).sort(), [
    "defaultConfirmationEnabled",
    "defaultConfirmationEndOffsetMinutes",
    "defaultConfirmationStartOffsetMinutes",
    "defaultJoinLockOffsetMinutes",
    "fullCapacityExpansionPolicy",
    "joinGateConfig",
    "participationFrequencyLimit",
  ]);
});

test("coordination and completion slices do not cross owner boundaries", async () => {
  const coordinationInput = {
    meetingPoint: null,
    locationMeetingPoints: {},
  };
  await updateAdminPRTypeConfigCoordination("study", coordinationInput);
  assert.deepEqual(coordination.update.mock.calls[0], [
    { type: "study", input: coordinationInput },
  ]);
  assert.equal(repository.updateByType.mock.calls.length, 0);

  await updateAdminPRTypeConfigCompletion("study", { feedbackQuestionnaireTemplateId: 1 });
  assert.deepEqual(questionnaire.findTemplateById.mock.calls[0], [1]);
  assert.deepEqual(Object.keys(repository.updateByType.mock.calls[0][1]), [
    "feedbackQuestionnaireTemplateId",
  ]);
});

test("completion rejects a questionnaire template that does not exist", async () => {
  questionnaire.findTemplateById.mockResolvedValue(null);

  await assert.rejects(
    updateAdminPRTypeConfigCompletion("study", { feedbackQuestionnaireTemplateId: 404 }),
    /Feedback questionnaire template not found/,
  );
  assert.equal(repository.updateByType.mock.calls.length, 0);
});
