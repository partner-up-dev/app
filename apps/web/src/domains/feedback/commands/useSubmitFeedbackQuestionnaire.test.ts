import { describe, expect, test } from "vitest";
import { readSubmitFeedbackQuestionnaireError } from "./useSubmitFeedbackQuestionnaire";

describe("feedback questionnaire command errors", () => {
  test("prefers Problem Details detail", async () => {
    const response = Response.json(
      { detail: "请补充条件问题", error: "legacy error" },
      { status: 400 },
    );

    await expect(readSubmitFeedbackQuestionnaireError(response)).resolves.toMatchObject({
      message: "请补充条件问题",
    });
  });

  test("retains the legacy error fallback", async () => {
    const response = Response.json({ error: "legacy error" }, { status: 400 });

    await expect(readSubmitFeedbackQuestionnaireError(response)).resolves.toMatchObject({
      message: "legacy error",
    });
  });
});
