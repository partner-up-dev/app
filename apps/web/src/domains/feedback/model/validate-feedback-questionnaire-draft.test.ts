import { describe, expect, test } from "vitest";
import type { FeedbackQuestionnaireDefinition } from "@partner-up-dev/backend/contracts";
import { findMissingFeedbackQuestionLabel } from "./validate-feedback-questionnaire-draft";

const definition = {
  key: "feedback-test",
  version: "1",
  title: "Feedback",
  questions: [
    {
      id: "rating",
      type: "single_choice",
      label: "Rating",
      required: true,
      options: [
        { value: "good", label: "Good" },
        {
          value: "bad",
          label: "Bad",
          requires: [{ questionId: "note" }],
        },
      ],
    },
    {
      id: "note",
      type: "textarea",
      label: "Improvement note",
      required: false,
      maxLength: 500,
    },
  ],
} satisfies FeedbackQuestionnaireDefinition;

describe("feedback draft validation", () => {
  test("reports a missing globally required answer", () => {
    expect(findMissingFeedbackQuestionLabel(definition, {})).toBe("Rating");
  });

  test("reports the selected option's missing follow-up", () => {
    expect(
      findMissingFeedbackQuestionLabel(definition, {
        rating: { type: "single_choice", value: "bad" },
      }),
    ).toBe("Improvement note");
  });

  test("accepts a complete conditional branch", () => {
    expect(
      findMissingFeedbackQuestionLabel(definition, {
        rating: { type: "single_choice", value: "bad" },
        note: { type: "textarea", value: "More seasoning" },
      }),
    ).toBeNull();
  });
});
