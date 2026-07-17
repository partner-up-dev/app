import { ref } from "vue";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { queryKeys } from "@/shared/api/query-keys";
import { usePRFeedbackQuestionnaireSubmission } from "./usePRFeedbackQuestionnaireSubmission";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn<() => Promise<void>>(),
  mutateAsync: vi.fn<() => Promise<unknown>>(),
  reset: vi.fn<() => void>(),
  isPending: { value: false },
  error: { value: null as Error | null },
}));

vi.mock("@tanstack/vue-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@/domains/feedback/commands/useSubmitFeedbackQuestionnaire", () => ({
  useSubmitFeedbackQuestionnaire: () => ({
    mutateAsync: mocks.mutateAsync,
    reset: mocks.reset,
    isPending: mocks.isPending,
    error: mocks.error,
  }),
}));

describe("PR feedback questionnaire submission workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.error.value = null;
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  test("submits only feedback command input then refreshes canonical PR detail", async () => {
    const response = { responseId: 8 };
    mocks.mutateAsync.mockResolvedValue(response);
    const workflow = usePRFeedbackQuestionnaireSubmission(ref(123));
    const input = {
      instanceId: 7,
      answers: {
        rating: { type: "single_choice" as const, value: "good" },
      },
    };

    await expect(workflow.submit(input)).resolves.toBe(response);
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(mocks.mutateAsync).toHaveBeenCalledWith(input);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.pr.detail(123),
    });
  });

  test("exposes command errors and does not refresh after a failed write", async () => {
    const error = new Error("请补充条件问题");
    mocks.error.value = error;
    mocks.mutateAsync.mockRejectedValue(error);
    const workflow = usePRFeedbackQuestionnaireSubmission(ref(123));

    await expect(workflow.submit({ instanceId: 7, answers: {} })).rejects.toBe(error);
    expect(workflow.errorMessage.value).toBe("请补充条件问题");
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });
});
