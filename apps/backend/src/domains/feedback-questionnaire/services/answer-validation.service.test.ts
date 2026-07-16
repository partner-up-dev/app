import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "../../../entities/feedback-questionnaire";
import { ProblemDetailsError } from "../../../lib/problem-details";
import { assertFeedbackAnswersMatchDefinition } from "./answer-validation.service";

const definition = {
  key: "food_tasting_post_pr_feedback",
  version: "1.0.0",
  title: "餐饮试吃活动反馈",
  questions: [
    {
      id: "overall_experience",
      type: "single_choice",
      label: "这次体验整体如何？",
      required: true,
      options: [
        { value: "good", label: "满意" },
        {
          value: "bad",
          label: "不满意",
          requires: [{ questionId: "comment" }],
        },
      ],
    },
    {
      id: "comment",
      type: "textarea",
      label: "有什么想补充的？",
      required: false,
      maxLength: 100,
    },
    {
      id: "photo",
      type: "image_upload",
      label: "可选：上传现场或凭证图片",
      required: false,
      purpose: "feedback",
    },
  ],
} satisfies FeedbackQuestionnaireDefinition;

const assertValidationFails = (answers: FeedbackQuestionnaireAnswers): void => {
  assert.throws(
    () => assertFeedbackAnswersMatchDefinition(definition, answers),
    (error: unknown) => {
      assert.ok(error instanceof ProblemDetailsError);
      assert.equal(error.status, 400);
      return true;
    },
  );
};

describe("assertFeedbackAnswersMatchDefinition", () => {
  it("accepts answers matching the questionnaire definition", () => {
    assert.doesNotThrow(() =>
      assertFeedbackAnswersMatchDefinition(definition, {
        overall_experience: {
          type: "single_choice",
          value: "good",
        },
        photo: {
          type: "image_upload",
          imageUrl: "https://example.com/photo.jpg",
        },
      }),
    );
  });

  it("requires configured required answers", () => {
    assertValidationFails({});
  });

  it("requires follow-up answers declared by a selected option", () => {
    assertValidationFails({
      overall_experience: {
        type: "single_choice",
        value: "bad",
      },
    });
  });

  it("rejects answers whose type does not match the question", () => {
    assertValidationFails({
      overall_experience: {
        type: "textarea",
        value: "good",
      },
    });
  });
});
