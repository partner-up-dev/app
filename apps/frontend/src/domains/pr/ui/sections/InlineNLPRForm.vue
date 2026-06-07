<template>
  <form class="inline-nl-pr-form" @submit.prevent="onSubmit">
    <Field name="rawText" v-slot="{ field, errors }">
      <div class="row row--input">
        <input
          class="nl-input"
          type="text"
          :value="field.value"
          @input="field.onChange(($event.target as HTMLInputElement).value)"
          :placeholder="placeholderText"
          :disabled="isSubmitting"
          maxlength="2000"
          autocomplete="off"
        />
        <button
          v-if="isVoiceSupported"
          class="voice-button"
          :class="{ 'is-recording': isVoiceRecording }"
          type="button"
          :disabled="isSubmitting || isVoiceProcessing"
          :aria-pressed="isVoiceRecording"
          :aria-label="t('nlForm.voiceAction')"
          @click="handleVoiceToggle"
        >
          <span
            v-if="isVoiceRecording"
            class="i-mdi-microphone voice-icon"
            aria-hidden="true"
          ></span>
          <span
            v-else
            class="i-mdi-microphone-outline voice-icon"
            aria-hidden="true"
          ></span>
        </button>
        <button
          class="send-button"
          type="submit"
          :disabled="isSubmitting"
          :aria-label="t('nlForm.submit')"
        >
          <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
          <span
            v-else
            class="i-mdi-send-outline send-icon"
            aria-hidden="true"
          ></span>
        </button>
      </div>
      <p v-if="voiceErrorMessage" class="error-message voice-error">
        {{ voiceErrorMessage }}
      </p>
      <span v-if="errors.length" class="error-message" style="flex-basis: 100%">
        {{ errors[0] }}
      </span>
    </Field>

    <ErrorToast
      v-if="createMutation.isError.value"
      :message="submitErrorMessage"
      @close="createMutation.reset()"
    />
  </form>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { Field, useForm } from "vee-validate";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import { createNaturalLanguagePRValidationSchema } from "@/lib/validation";
import { useCreatePRFromNaturalLanguage } from "@/domains/pr/queries/usePRCreate";
import { useLandingTypewriterPlaceholder } from "@/domains/landing/use-cases/useLandingTypewriterPlaceholder";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import { useNaturalLanguageDraftStore } from "@/domains/pr/use-cases/useNaturalLanguageDraft";
import { useWeChatVoiceInput } from "@/shared/wechat/useWeChatVoiceInput";

const getLocalWeekdayLabel = (date: Date): string => {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(date);
};

const router = useRouter();
const { t } = useI18n();
const createMutation = useCreatePRFromNaturalLanguage();
const { activeExampleText, typedExampleText } =
  useLandingTypewriterPlaceholder();
const draftStore = useNaturalLanguageDraftStore();
const { rawText: draftRawText } = storeToRefs(draftStore);
const placeholderText = computed(() =>
  t("prInput.placeholder", { example: typedExampleText.value }),
);
const resolvedPlaceholderText = computed(() =>
  t("prInput.placeholder", { example: activeExampleText.value }),
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

  return resolvedPlaceholderText.value;
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
  if (
    !isVoiceSupported.value ||
    isSubmitting.value ||
    isVoiceProcessing.value
  ) {
    return;
  }

  if (isVoiceRecording.value) {
    await stopRecording();
    return;
  }

  try {
    await startRecording();
  } catch {
    // Error handled by hook state.
  }
};
</script>

<style lang="scss" scoped>
.inline-nl-pr-form {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
  align-items: flex-start;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
}

.row--input {
  flex: 1;
  min-width: 0;
}

.nl-input {
  @include mx.pu-font(body);
  width: 100%;
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
  padding: 0 var(--sys-spacing-medium);
  transition:
    border-color 180ms ease,
    background-color 180ms ease;

  &::placeholder {
    color: var(--sys-color-on-surface-variant);
  }

  &:focus {
    outline: none;
    border-color: var(--sys-color-primary);
    background: var(--sys-color-surface);
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
  }
}

.send-button {
  @include mx.pu-font(control);
  min-width: 4.8rem;
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  border: 1px solid var(--sys-color-primary);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  padding: 0 var(--sys-spacing-small);
  cursor: pointer;
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;

  &:hover:not(:disabled) {
    opacity: 0.92;
    border-color: var(--sys-color-primary);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
  }
}

.send-icon {
  @include mx.pu-icon(small, true);
}

.spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 999px;
  animation: spin 800ms linear infinite;
}

.voice-button {
  @include mx.pu-font(control);
  min-width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  border: 1px dashed var(--sys-color-primary);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
  cursor: pointer;
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;

  &:hover:not(:disabled) {
    opacity: 0.92;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &.is-recording {
    border-style: solid;
    border-color: var(--sys-color-primary);
    background: var(--sys-color-primary);
    color: var(--sys-color-on-primary);
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
  }
}

.voice-icon {
  @include mx.pu-icon(small, true);
}

.error-message {
  @include mx.pu-font(control);
  color: var(--sys-color-error);
}

.voice-error {
  margin: 0;
}

@media (max-width: 768px) {
  .inline-nl-pr-form {
    gap: var(--sys-spacing-xsmall);
  }

  .send-button {
    min-width: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  }
}

@media (prefers-reduced-motion: reduce) {
  .send-button,
  .spinner {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
