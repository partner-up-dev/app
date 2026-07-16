import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateFeedbackQuestionnaireInstanceId: vi.fn(),
  materializeFeedbackQuestionnaireInstance: vi.fn(),
}));
vi.mock("../../../repositories/PartnerRequestRepository", () => ({
  PartnerRequestRepository: class {
    updateFeedbackQuestionnaireInstanceId = mocks.updateFeedbackQuestionnaireInstanceId;
  },
}));
vi.mock("./materialize-feedback-questionnaire", () => ({
  materializeFeedbackQuestionnaireInstance: mocks.materializeFeedbackQuestionnaireInstance,
}));

const { materializePRTypeCompletionQuestionnaire } = await import(
  "./pr-type-completion-questionnaire"
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.materializeFeedbackQuestionnaireInstance.mockResolvedValue(99);
});

describe("materializePRTypeCompletionQuestionnaire", () => {
  it("materializes and snapshots the configured template", async () => {
    await materializePRTypeCompletionQuestionnaire({
      prId: 3,
      feedbackQuestionnaireTemplateId: 12,
    });
    expect(mocks.materializeFeedbackQuestionnaireInstance).toHaveBeenCalledWith(12);
    expect(mocks.updateFeedbackQuestionnaireInstanceId).toHaveBeenCalledWith(3, 99);
  });
});
