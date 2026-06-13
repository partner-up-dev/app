<template>
  <form class="feedback-form" @submit.prevent="handleSubmit">
    <div class="feedback-form__questions">
      <template
        v-for="question in definition.questions"
        :key="question.id"
      >
        <fieldset
          v-if="question.type === 'single_choice'"
          class="feedback-form__question"
        >
          <legend class="feedback-form__label">
            {{ question.label }}
            <span v-if="question.required" aria-hidden="true">*</span>
          </legend>

          <div class="choice-list">
            <label
              v-for="option in question.options"
              :key="option.value"
              class="choice-row"
            >
              <input
                type="radio"
                :name="question.id"
                :value="option.value"
                :checked="readSingleChoiceValue(question.id) === option.value"
                :disabled="pending"
                @change="setSingleChoiceAnswer(question.id, option.value)"
              />
              <span>{{ option.label }}</span>
            </label>
          </div>
        </fieldset>
        <PuFormItem
          v-else-if="question.type === 'textarea'"
          :label="question.label"
          :for-id="feedbackFieldId(question.id)"
          :required="question.required"
        >
          <PuTextarea
            :id="feedbackFieldId(question.id)"
            :model-value="readTextareaValue(question.id)"
            :maxlength="question.maxLength"
            :disabled="pending"
            show-count
            @update:model-value="setTextareaAnswer(question.id, $event)"
          />
        </PuFormItem>
        <PuFormItem
          v-else
          :label="question.label"
          :for-id="feedbackFieldId(question.id)"
          :required="question.required"
        >
          <ImageUrlInput
            :model-value="readImageUrl(question.id)"
            :input-id="feedbackFieldId(question.id)"
            purpose="feedback"
            upload-label="上传图片"
            uploading-label="上传中..."
            preview-alt="反馈图片预览"
            :disabled="pending"
            :allow-url-input="false"
            data-testid="pr-detail.feedback.image-upload"
            @update:model-value="setImageAnswer(question.id, $event)"
          />
        </PuFormItem>
      </template>
    </div>

    <p v-if="validationMessage" class="feedback-form__error">
      {{ validationMessage }}
    </p>

    <div class="feedback-form__actions">
      <PuButton
        :action="{ native: 'submit' }"
        :loading="pending"
        :disabled="pending"
        data-testid="pr-detail.feedback.submit"
      >
        {{ pending ? "提交中..." : "提交反馈" }}
      </PuButton>
      <PuButton

        tone="neutral" variant="soft"
        :disabled="pending"
        @click="$emit('cancel')"
      >
        稍后填写
      </PuButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "@partner-up-dev/backend";
import ImageUrlInput from "@/shared/upload/ImageUrlInput.vue";
import { PuButton, PuFormItem, PuTextarea } from "@partner-up-dev/design-web";

const props = defineProps<{
  instanceId: number;
  definition: FeedbackQuestionnaireDefinition;
  pending: boolean;
}>();

const emit = defineEmits<{
  submit: [answers: FeedbackQuestionnaireAnswers];
  cancel: [];
}>();

const answers = ref<FeedbackQuestionnaireAnswers>({});
const validationMessage = ref<string | null>(null);

const readSingleChoiceValue = (questionId: string): string | null => {
  const answer = answers.value[questionId];
  return answer?.type === "single_choice" ? answer.value : null;
};

const readTextareaValue = (questionId: string): string => {
  const answer = answers.value[questionId];
  return answer?.type === "textarea" ? answer.value : "";
};

const readImageUrl = (questionId: string): string => {
  const answer = answers.value[questionId];
  return answer?.type === "image_upload" ? answer.imageUrl : "";
};

const feedbackFieldId = (questionId: string): string =>
  `feedback-${props.instanceId}-${questionId}`;

const setSingleChoiceAnswer = (questionId: string, value: string): void => {
  validationMessage.value = null;
  answers.value = {
    ...answers.value,
    [questionId]: {
      type: "single_choice",
      value,
    },
  };
};

const setTextareaAnswer = (questionId: string, value: string): void => {
  validationMessage.value = null;
  answers.value = {
    ...answers.value,
    [questionId]: {
      type: "textarea",
      value,
    },
  };
};

const setImageAnswer = (questionId: string, imageUrl: string): void => {
  validationMessage.value = null;
  answers.value = {
    ...answers.value,
    [questionId]: {
      type: "image_upload",
      imageUrl,
    },
  };
};

const isAnswered = (questionId: string): boolean => {
  const answer = answers.value[questionId];
  if (!answer) return false;
  if (answer.type === "single_choice") return answer.value.trim().length > 0;
  if (answer.type === "textarea") return answer.value.trim().length > 0;
  return answer.imageUrl.trim().length > 0;
};

const handleSubmit = (): void => {
  const missingQuestion = props.definition.questions.find(
    (question) => question.required && !isAnswered(question.id),
  );
  if (missingQuestion) {
    validationMessage.value = `请填写「${missingQuestion.label}」`;
    return;
  }

  emit("submit", answers.value);
};
</script>

<style lang="scss" scoped>
.feedback-form,
.feedback-form__questions,
.feedback-form__question,
.choice-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.feedback-form {
  gap: var(--sys-spacing-medium);
}

.feedback-form__questions {
  gap: var(--sys-spacing-medium);
}

.feedback-form__question {
  gap: var(--sys-spacing-small);
  padding: 0;
  margin: 0;
  border: 0;
}

.feedback-form__label {
  margin: 0;
  padding: 0;
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.choice-list {
  gap: var(--sys-spacing-xsmall);
}

.choice-row {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  color: var(--sys-color-on-surface);
  @include mx.pu-font(body);
}

.feedback-form__error {
  margin: 0;
  color: var(--sys-color-error);
  @include mx.pu-font(support);
}

.feedback-form__actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--sys-spacing-small);
}

@media (max-width: 560px) {
  .feedback-form__actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
