import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PRJoinGateConfig } from "../contracts/join-gate";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

const mocks = vi.hoisted(() => ({
  findConfigByType: vi.fn<() => unknown>(),
  findPRById: vi.fn<() => unknown>(),
  updatePartnerRules: vi.fn<() => unknown>(),
  updateNotes: vi.fn<() => unknown>(),
  updateJoinGateConfig: vi.fn<() => unknown>(),
  updateFeedbackQuestionnaireInstanceId: vi.fn<() => unknown>(),
  materializeFeedbackQuestionnaireInstance: vi.fn<() => unknown>(),
}));

vi.mock("../../../repositories/PRTypeConfigRepository", () => ({
  PRTypeConfigRepository: class {
    findByType = mocks.findConfigByType;
  },
}));

vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    findById = mocks.findPRById;
    updatePartnerRules = mocks.updatePartnerRules;
    updateNotes = mocks.updateNotes;
    updateJoinGateConfig = mocks.updateJoinGateConfig;
    updateFeedbackQuestionnaireInstanceId = mocks.updateFeedbackQuestionnaireInstanceId;
  },
}));

vi.mock("../../feedback-questionnaire", () => ({
  materializeFeedbackQuestionnaireInstance: mocks.materializeFeedbackQuestionnaireInstance,
}));

const { materializePRTypeConfigurationAtCreation } =
  await import("./pr-type-creation-materialization.service");

const configGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "type-notice",
  version: "v1",
  title: "Type notice",
  source: "PR_TYPE_CONFIG",
  body: "Read the type notice",
};

const prGate: PRJoinGateConfig[number] = {
  kind: "JOIN_NOTICE",
  key: "pr-notice",
  version: "v1",
  title: "PR notice",
  source: "PR",
  body: "Read the PR notice",
};

const config = {
  type: "badminton",
  defaultNotes: "Arrive early for court setup.",
  defaultConfirmationEnabled: true,
  defaultConfirmationStartOffsetMinutes: 180,
  defaultConfirmationEndOffsetMinutes: 45,
  defaultJoinLockOffsetMinutes: 15,
  joinGateConfig: [configGate],
  feedbackQuestionnaireTemplateId: 12,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findConfigByType.mockResolvedValue(config);
  mocks.findPRById.mockResolvedValue({
    confirmationEnabled: false,
    confirmationStartOffsetMinutes: null,
    confirmationEndOffsetMinutes: null,
    joinLockOffsetMinutes: null,
  });
  mocks.materializeFeedbackQuestionnaireInstance.mockResolvedValue(99);
});

describe("materializePRTypeConfigurationAtCreation", () => {
  test("looks up the trimmed type and writes defaults onto the PR", async () => {
    await materializePRTypeConfigurationAtCreation({
      prId: 41,
      type: "  badminton ",
      prNotes: null,
      prJoinGateConfig: [prGate],
    });

    expect(mocks.findConfigByType).toHaveBeenCalledWith("badminton");
    expect(mocks.updatePartnerRules).toHaveBeenCalledWith(41, {
      confirmationEnabled: true,
      confirmationStartOffsetMinutes: 180,
      confirmationEndOffsetMinutes: 45,
      joinLockOffsetMinutes: 15,
    });
    expect(mocks.updateNotes).toHaveBeenCalledWith(41, "Arrive early for court setup.");
    expect(mocks.updateJoinGateConfig).toHaveBeenCalledWith(41, [configGate, prGate]);
    expect(mocks.materializeFeedbackQuestionnaireInstance).toHaveBeenCalledWith(12);
    expect(mocks.updateFeedbackQuestionnaireInstanceId).toHaveBeenCalledWith(41, 99);
  });

  test("keeps explicit PR gates when no type config exists", async () => {
    mocks.findConfigByType.mockResolvedValue(null);

    await materializePRTypeConfigurationAtCreation({
      prId: 42,
      type: "unconfigured-type",
      prJoinGateConfig: [prGate],
    });

    expect(mocks.updateJoinGateConfig).toHaveBeenCalledWith(42, [prGate]);
    expect(mocks.updatePartnerRules).not.toHaveBeenCalled();
    expect(mocks.updateNotes).not.toHaveBeenCalled();
    expect(mocks.updateFeedbackQuestionnaireInstanceId).not.toHaveBeenCalled();
  });

  test("does not rewrite an existing participation snapshot", async () => {
    mocks.findPRById.mockResolvedValue({
      confirmationEnabled: true,
      confirmationStartOffsetMinutes: 240,
      confirmationEndOffsetMinutes: 60,
      joinLockOffsetMinutes: 60,
    });

    await materializePRTypeConfigurationAtCreation({
      prId: 43,
      type: "badminton",
      prNotes: "Already authored",
      prJoinGateConfig: [prGate],
    });

    expect(mocks.updatePartnerRules).not.toHaveBeenCalled();
    expect(mocks.updateJoinGateConfig).toHaveBeenCalledWith(43, [configGate, prGate]);
  });
});
