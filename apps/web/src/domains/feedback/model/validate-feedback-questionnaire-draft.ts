import type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "@partner-up-dev/backend";

const isAnswered = (answers: FeedbackQuestionnaireAnswers, questionId: string): boolean => {
  const answer = answers[questionId];
  if (!answer) return false;
  if (answer.type === "single_choice") return answer.value.trim().length > 0;
  if (answer.type === "textarea") return answer.value.trim().length > 0;
  return answer.imageUrl.trim().length > 0;
};

export const findMissingFeedbackQuestionLabel = (
  definition: FeedbackQuestionnaireDefinition,
  answers: FeedbackQuestionnaireAnswers,
): string | null => {
  const requiredQuestion = definition.questions.find(
    (question) => question.required && !isAnswered(answers, question.id),
  );
  if (requiredQuestion) return requiredQuestion.label;

  for (const question of definition.questions) {
    if (question.type !== "single_choice") continue;
    const answer = answers[question.id];
    if (answer?.type !== "single_choice") continue;
    const selectedOption = question.options.find((option) => option.value === answer.value);
    for (const requirement of selectedOption?.requires ?? []) {
      if (isAnswered(answers, requirement.questionId)) continue;
      const followUp = definition.questions.find((item) => item.id === requirement.questionId);
      return followUp?.label ?? requirement.questionId;
    }
  }

  return null;
};
