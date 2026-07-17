import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "../../../entities/feedback-questionnaire";

type FeedbackAnswer = FeedbackQuestionnaireAnswers[string];
type SingleChoiceAnswer = { type: "single_choice"; value: string };
type TextareaAnswer = { type: "textarea"; value: string };
type ImageUploadAnswer = { type: "image_upload"; imageUrl: string };

const getAnswer = (
  answers: FeedbackQuestionnaireAnswers,
  questionId: string,
): FeedbackAnswer | null => answers[questionId] ?? null;

const isSingleChoiceAnswer = (answer: FeedbackAnswer): answer is SingleChoiceAnswer =>
  answer.type === "single_choice";

const isTextareaAnswer = (answer: FeedbackAnswer): answer is TextareaAnswer =>
  answer.type === "textarea";

const isImageUploadAnswer = (answer: FeedbackAnswer): answer is ImageUploadAnswer =>
  answer.type === "image_upload";

const isAnswerPresent = (answers: FeedbackQuestionnaireAnswers, questionId: string): boolean => {
  const answer = getAnswer(answers, questionId);
  if (!answer) return false;
  if (answer.type === "textarea") return answer.value.trim().length > 0;
  if (answer.type === "image_upload") return answer.imageUrl.trim().length > 0;
  return answer.value.trim().length > 0;
};

const fail = (message: string): never => {
  return throwHttpProblem({ status: 400, detail: message });
};

export const assertFeedbackAnswersMatchDefinition = (
  definition: FeedbackQuestionnaireDefinition,
  answers: FeedbackQuestionnaireAnswers,
): void => {
  const questionIds = new Set(definition.questions.map((question) => question.id));
  for (const answerId of Object.keys(answers)) {
    if (!questionIds.has(answerId)) {
      fail(`Unknown answer question: ${answerId}`);
    }
  }

  for (const question of definition.questions) {
    const answer = getAnswer(answers, question.id);
    if (question.required && !isAnswerPresent(answers, question.id)) {
      fail(`Question is required: ${question.id}`);
    }
    if (!answer) continue;

    if (question.type === "single_choice") {
      if (!isSingleChoiceAnswer(answer)) {
        fail(`Answer type does not match question: ${question.id}`);
        continue;
      }
      const selectedOption = question.options.find((item) => item.value === answer.value);
      if (!selectedOption) {
        fail(`Invalid option for question: ${question.id}`);
        continue;
      }
      for (const requirement of selectedOption.requires ?? []) {
        if (!isAnswerPresent(answers, requirement.questionId)) {
          fail(`Required follow-up answer missing: ${requirement.questionId}`);
        }
      }
      continue;
    }

    if (question.type === "textarea") {
      if (!isTextareaAnswer(answer)) {
        fail(`Answer type does not match question: ${question.id}`);
        continue;
      }
      if (answer.value.length > question.maxLength) {
        fail(`Text answer is too long: ${question.id}`);
      }
      continue;
    }

    if (!isImageUploadAnswer(answer)) {
      fail(`Answer type does not match question: ${question.id}`);
      continue;
    }
    if (answer.imageUrl.trim().length === 0) {
      fail(`Image answer is required: ${question.id}`);
    }
  }
};
