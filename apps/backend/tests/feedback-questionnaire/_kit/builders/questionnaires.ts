import assert from "node:assert/strict";
import {
  type FeedbackQuestionnaireAnswers,
  type FeedbackQuestionnaireDefinition,
  type FeedbackQuestionnaireInstance,
  type FeedbackQuestionnaireTemplate,
} from "../../../../src/entities/feedback-questionnaire";
import { FeedbackQuestionnaireRepository } from "../../../../src/repositories/FeedbackQuestionnaireRepository";

const feedbackRepo = new FeedbackQuestionnaireRepository();

let scenarioQuestionnaireSequence = 0;

export function buildFoodTastingFeedbackDefinition(label: string): FeedbackQuestionnaireDefinition {
  const sequence = scenarioQuestionnaireSequence++;
  return {
    key: `scenario_food_tasting_feedback_${label}_${sequence}`,
    version: "1",
    title: `Scenario food tasting feedback ${label}`,
    questions: [
      {
        id: "taste_rating",
        type: "single_choice",
        label: "Taste rating",
        required: true,
        options: [
          {
            value: "recommend",
            label: "Recommend",
            requires: [{ questionId: "recommendation_image" }],
          },
          {
            value: "needs_improvement",
            label: "Needs improvement",
            requires: [{ questionId: "improvement_note" }],
          },
        ],
      },
      {
        id: "recommendation_image",
        type: "image_upload",
        label: "Recommendation image",
        required: false,
        purpose: "feedback",
      },
      {
        id: "improvement_note",
        type: "textarea",
        label: "Improvement note",
        required: false,
        maxLength: 500,
      },
    ],
  };
}

export async function givenFeedbackQuestionnaireTemplate(input: {
  label: string;
  definition?: FeedbackQuestionnaireDefinition;
}): Promise<FeedbackQuestionnaireTemplate> {
  const definition = input.definition ?? buildFoodTastingFeedbackDefinition(input.label);
  const template = await feedbackRepo.createTemplate({
    key: definition.key,
    version: definition.version,
    title: definition.title,
    definition,
  });

  assert.ok(template, `Failed to create feedback template: ${input.label}`);
  return template;
}

export async function givenFeedbackQuestionnaireInstance(input: {
  template: FeedbackQuestionnaireTemplate;
}): Promise<FeedbackQuestionnaireInstance> {
  const instance = await feedbackRepo.createInstanceFromTemplate(input.template.id);
  assert.ok(instance, `Failed to create feedback instance: ${input.template.id}`);
  return instance;
}

export function buildRecommendFeedbackAnswers(): FeedbackQuestionnaireAnswers {
  return {
    taste_rating: {
      type: "single_choice",
      value: "recommend",
    },
    recommendation_image: {
      type: "image_upload",
      imageUrl: "https://example.test/feedback/recommendation.jpg",
    },
  };
}

export function buildNeedsImprovementFeedbackAnswers(): FeedbackQuestionnaireAnswers {
  return {
    taste_rating: {
      type: "single_choice",
      value: "needs_improvement",
    },
    improvement_note: {
      type: "textarea",
      value: "More seasoning would help.",
    },
  };
}
