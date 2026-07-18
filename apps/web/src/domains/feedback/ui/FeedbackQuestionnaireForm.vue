<template>
  <form class="feedback-form" @submit.prevent="handleSubmit">
    <div class="feedback-form__questions">
      <template v-for="question in definition.questions" :key="question.id">
        <fieldset v-if="question.type === 'single_choice'" class="feedback-form__question">
          <legend class="feedback-form__label">
            {{ question.label }}
            <span v-if="question.required" aria-hidden="true">*</span>
          </legend>

          <div class="choice-list">
            <PuRadio
              v-for="option in question.options"
              :key="option.value"
              class="choice-row"
              :model-value="readSingleChoiceValue(question.id)"
              :name="question.id"
              :value="option.value"
              :disabled="pending"
              :data-testid="`pr-detail.feedback.choice.${question.id}.${option.value}`"
              @update:model-value="setSingleChoiceAnswer(question.id, $event)"
            >
              {{ option.label }}
            </PuRadio>
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
          <PuFileUpload
            :id="feedbackFieldId(question.id)"
            :model-value="readImageUploadValue(question.id)"
            mode="file"
            layout="panel"
            :accept="IMAGE_UPLOAD_ACCEPT"
            choose-label="上传图片"
            drop-label="上传图片"
            drop-description="反馈图片预览"
            replace-label="上传图片"
            :disabled="pending || isImageQuestionUploading(question.id)"
            data-testid="pr-detail.feedback.image-upload"
            @add="handleImageUploadAdd(question.id, $event)"
            @remove="handleImageUploadRemove(question.id)"
            @reject="handleImageUploadReject(question.id, $event)"
            @update:model-value="handleImageUploadUpdate(question.id, $event)"
          />
          <PuInlineNotice
            v-if="imageUploadError(question.id)"
            tone="error"
            :message="imageUploadError(question.id) ?? ''"
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
        :action="{ native: 'button' }"
        tone="neutral"
        variant="soft"
        :disabled="pending"
        data-testid="pr-detail.feedback.cancel"
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
} from "@partner-up-dev/backend/contracts";
import { useCloudStorage } from "@/shared/upload/useCloudStorage";
import {
  IMAGE_UPLOAD_ACCEPT,
  imageUploadItemFromUrl,
} from "@/shared/upload/useDesignWebImageUpload";
import {
  PuButton,
  PuFileUpload,
  PuFormItem,
  PuInlineNotice,
  PuRadio,
  PuTextarea,
  type PuFileUploadItem,
  type PuFileUploadRejection,
  type PuFileUploadValue,
} from "@partner-up-dev/design-web";
import { findMissingFeedbackQuestionLabel } from "@/domains/feedback/model/validate-feedback-questionnaire-draft";

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
const imageUploadValues = ref<Record<string, PuFileUploadValue>>({});
const imageUploadErrors = ref<Record<string, string | null>>({});
const uploadingImageQuestionIds = ref<Set<string>>(new Set());
const { uploadImage, uploadError, clearError } = useCloudStorage();

const readSingleChoiceValue = (questionId: string): string | undefined => {
  const answer = answers.value[questionId];
  return answer?.type === "single_choice" ? answer.value : undefined;
};

const readTextareaValue = (questionId: string): string => {
  const answer = answers.value[questionId];
  return answer?.type === "textarea" ? answer.value : "";
};

const readImageUrl = (questionId: string): string => {
  const answer = answers.value[questionId];
  return answer?.type === "image_upload" ? answer.imageUrl : "";
};

const readImageUploadValue = (questionId: string): PuFileUploadValue => {
  const localValue = imageUploadValues.value[questionId];
  if (localValue !== undefined) {
    return localValue;
  }

  const imageUrl = readImageUrl(questionId).trim();
  return imageUrl ? imageUploadItemFromUrl(imageUrl) : null;
};

const feedbackFieldId = (questionId: string): string =>
  `feedback-${props.instanceId}-${questionId}`;

const setSingleChoiceAnswer = (questionId: string, value: string | number | boolean): void => {
  validationMessage.value = null;
  answers.value = {
    ...answers.value,
    [questionId]: {
      type: "single_choice",
      value: String(value),
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

const setImageUploadValue = (questionId: string, value: PuFileUploadValue): void => {
  imageUploadValues.value = {
    ...imageUploadValues.value,
    [questionId]: value,
  };
};

const clearImageUploadValue = (questionId: string): void => {
  const nextValues = { ...imageUploadValues.value };
  delete nextValues[questionId];
  imageUploadValues.value = nextValues;
};

const setImageUploadError = (questionId: string, message: string | null): void => {
  imageUploadErrors.value = {
    ...imageUploadErrors.value,
    [questionId]: message,
  };
};

const setImageQuestionUploading = (questionId: string, isUploading: boolean): void => {
  const nextIds = new Set(uploadingImageQuestionIds.value);
  if (isUploading) {
    nextIds.add(questionId);
  } else {
    nextIds.delete(questionId);
  }
  uploadingImageQuestionIds.value = nextIds;
};

const isImageQuestionUploading = (questionId: string): boolean =>
  uploadingImageQuestionIds.value.has(questionId);

const imageUploadError = (questionId: string): string | null =>
  imageUploadErrors.value[questionId] ?? null;

const handleImageUploadUpdate = (questionId: string, value: PuFileUploadValue): void => {
  setImageUploadValue(questionId, value);
  setImageUploadError(questionId, null);

  if (value === null) {
    setImageAnswer(questionId, "");
    clearImageUploadValue(questionId);
    clearError();
    return;
  }

  if (value.source === "url" && value.url) {
    setImageAnswer(questionId, value.url);
    clearError();
  }
};

const handleImageUploadAdd = async (questionId: string, item: PuFileUploadItem): Promise<void> => {
  setImageUploadError(questionId, null);

  if (item.source === "url" && item.url) {
    setImageAnswer(questionId, item.url);
    setImageUploadValue(questionId, imageUploadItemFromUrl(item.url, item.name));
    clearError();
    return;
  }

  if (!item.file) {
    setImageUploadValue(questionId, item);
    return;
  }

  setImageQuestionUploading(questionId, true);
  setImageUploadValue(questionId, {
    ...item,
    status: "uploading",
    message: "上传中...",
  });

  try {
    const imageUrl = await uploadImage(item.file, { purpose: "feedback" });
    setImageAnswer(questionId, imageUrl);
    setImageUploadValue(questionId, imageUploadItemFromUrl(imageUrl, item.name));
  } catch (error) {
    const message = uploadError.value ?? (error instanceof Error ? error.message : "上传失败");
    setImageUploadError(questionId, message);
    setImageUploadValue(questionId, {
      ...item,
      status: "error",
      message,
    });
  } finally {
    setImageQuestionUploading(questionId, false);
  }
};

const handleImageUploadRemove = (questionId: string): void => {
  setImageAnswer(questionId, "");
  clearImageUploadValue(questionId);
  setImageUploadError(questionId, null);
  clearError();
};

const handleImageUploadReject = (questionId: string, rejections: PuFileUploadRejection[]): void => {
  setImageUploadError(questionId, rejections[0]?.message ?? null);
};

const handleSubmit = (): void => {
  const missingQuestionLabel = findMissingFeedbackQuestionLabel(props.definition, answers.value);
  if (missingQuestionLabel) {
    validationMessage.value = `请填写「${missingQuestionLabel}」`;
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
