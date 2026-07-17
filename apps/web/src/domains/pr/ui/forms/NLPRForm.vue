<template>
  <PuForm class="nl-form" @submit="onSubmit">
    <Field name="rawText" v-slot="{ field, errors }">
      <div class="nl-field">
        <PuTextarea
          id="pr-text"
          :model-value="field.value"
          @update:model-value="field.onChange"
          :disabled="isSubmitting"
          :placeholder="placeholderText"
          :maxlength="120"
          show-count
        />
        <div class="nl-actions">
          <button
            v-if="isVoiceSupported"
            type="button"
            class="voice-action"
            :class="{ 'is-recording': isVoiceRecording }"
            :disabled="isSubmitting || isVoiceProcessing"
            :aria-pressed="isVoiceRecording"
            @click="handleVoiceToggle"
          >
            <span v-if="isVoiceRecording">
              {{ t("nlForm.voiceRecording") }}
            </span>
            <span v-else-if="isVoiceProcessing">
              {{ t("nlForm.voiceProcessing") }}
            </span>
            <span v-else>
              {{ t("nlForm.voiceAction") }}
            </span>
          </button>
        </div>
        <p v-if="voiceErrorMessage" class="error-message voice-error">
          {{ voiceErrorMessage }}
        </p>
        <span v-if="errors.length" class="error-message">{{ errors[0] }}</span>
      </div>
    </Field>

    <PuButton :action="{ native: 'submit' }" class="submit-action" :loading="isSubmitting" block>
      {{ t("nlForm.submit") }}
    </PuButton>

    <PuLoadingState v-if="isSubmitting" :message="t('nlForm.parsing')" />

    <PuInlineNotice
      tone="error"
      dismissible
      v-if="createMutation.isError.value"
      :message="submitErrorMessage"
      @close="createMutation.reset()"
    />
  </PuForm>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { Field, useForm } from "vee-validate";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { createNaturalLanguagePRValidationSchema } from "@/lib/validation";
import { useCreatePRFromNaturalLanguage } from "@/domains/pr/queries/usePRCreate";
import { useLandingRotatingTopic } from "@/domains/landing/use-cases/useLandingRotatingTopic";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import { useNaturalLanguageDraftStore } from "@/domains/pr/use-cases/useNaturalLanguageDraft";
import { useWeChatVoiceInput } from "@/shared/wechat/useWeChatVoiceInput";
import {
  PuButton,
  PuForm,
  PuInlineNotice,
  PuLoadingState,
  PuTextarea,
} from "@partner-up-dev/design-web";

const getLocalWeekdayLabel = (date: Date): string => {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(date);
};

const router = useRouter();
const { t } = useI18n();
const createMutation = useCreatePRFromNaturalLanguage();
const { rotatingTopicExample } = useLandingRotatingTopic();
const draftStore = useNaturalLanguageDraftStore();
const { rawText: draftRawText } = storeToRefs(draftStore);
const placeholderText = computed(() =>
  t("prInput.placeholder", { example: rotatingTopicExample.value }),
);
const isSubmitting = computed(() => createMutation.isPending.value);
const submitErrorMessage = computed(
  () => createMutation.error.value?.message || t("nlForm.createFailed"),
);

const mergeVoiceTranscript = (text: string): void => {
  const current = (values.rawText ?? "").trim();
  const merged = current.length > 0 ? `${current} ${text}` : text;
  setFieldValue("rawText", merged);
};

const {
  isSupported: isVoiceSupported,
  isRecording: isVoiceRecording,
  isProcessing: isVoiceProcessing,
  errorMessage: voiceErrorMessage,
  startRecording,
  stopRecording,
  resetError: resetVoiceError,
} = useWeChatVoiceInput({
  onTranscript: mergeVoiceTranscript,
});

const { handleSubmit, values, setFieldValue, resetForm } = useForm({
  validationSchema: createNaturalLanguagePRValidationSchema,
  initialValues: {
    rawText: draftRawText.value,
  },
});

watch(
  () => values.rawText,
  (value) => {
    draftStore.setRawText(value ?? "");
  },
  { immediate: true },
);

const resolveRawText = (): string => {
  const trimmed = (values.rawText ?? "").trim();
  if (trimmed.length > 0) {
    return values.rawText ?? "";
  }

  return placeholderText.value;
};

const submitHandler = handleSubmit(async (values) => {
  await ensureAuthSessionBootstrapped();

  const now = new Date();
  const created = await createMutation.mutateAsync({
    rawText: values.rawText,
    nowIso: now.toISOString(),
    nowWeekday: getLocalWeekdayLabel(now),
  });

  if (created.status === "DRAFT") {
    await router.push(created.canonicalPath);
  } else {
    await router.push(`${created.canonicalPath}?entry=create`);
  }
  draftStore.clear();
  resetForm({
    values: { rawText: "" },
  });
});

const onSubmit = async () => {
  resetVoiceError();
  const resolvedText = resolveRawText();
  if (resolvedText !== values.rawText) {
    setFieldValue("rawText", resolvedText);
  }

  await submitHandler();
};

const handleVoiceToggle = async (): Promise<void> => {
  if (!isVoiceSupported.value || isSubmitting.value || isVoiceProcessing.value) {
    return;
  }

  if (isVoiceRecording.value) {
    await stopRecording();
    return;
  }

  try {
    await startRecording();
  } catch {
    // Error already captured by hook state.
  }
};
</script>

<style lang="scss" scoped>
.nl-form {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.nl-field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.nl-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sys-spacing-xsmall);
}

.voice-action {
  @include mx.pu-font(control);
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  padding: 0 var(--sys-spacing-small);
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  border-radius: var(--sys-radius-small);
  border: 1px dashed var(--sys-color-primary);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    transform 180ms ease,
    border-color 180ms ease;

  &.is-recording {
    border-style: solid;
    background: var(--sys-color-primary);
    color: var(--sys-color-on-primary);
  }

  &:hover:not(:disabled) {
    background: var(--sys-color-primary-container);
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
  }
}

.submit-action {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.error-message {
  color: var(--sys-color-error);
  @include mx.pu-font(control);
}

.voice-error {
  margin: 0;
}
</style>
