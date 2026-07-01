<template>
  <PuForm class="inline-nl-pr-form" @submit="onSubmit">
    <Field name="rawText" v-slot="{ field, errors }">
      <PuFormItem class="inline-nl-pr-form__field" :error="errors[0]">
        <div class="inline-nl-pr-form__controls">
          <PuInput
            class="inline-nl-pr-form__input"
            :model-value="field.value"
            :placeholder="placeholderText"
            :disabled="isSubmitting"
            :maxlength="2000"
            :invalid="errors.length > 0"
            autocomplete="off"
            @update:model-value="field.onChange"
          />
          <PuButton
            v-if="isVoiceSupported"
            class="inline-nl-pr-form__voice-action"
            :action="{ native: 'button' }"
            shape="rect"
            tone="primary"
            :variant="isVoiceRecording ? 'solid' : 'dashed'"
            size="md"
            :disabled="isSubmitting || isVoiceProcessing"
            :aria-pressed="isVoiceRecording"
            :aria-label="t('nlForm.voiceAction')"
            @click="handleVoiceToggle"
          >
            <span
              v-if="isVoiceRecording"
              class="i-mdi-microphone inline-nl-pr-form__icon"
              aria-hidden="true"
            />
            <span
              v-else
              class="i-mdi-microphone-outline inline-nl-pr-form__icon"
              aria-hidden="true"
            />
          </PuButton>
          <PuButton
            class="inline-nl-pr-form__submit-action"
            :action="{ native: 'submit' }"
            shape="rect"
            tone="primary"
            variant="solid"
            size="md"
            :disabled="isSubmitting"
            :loading="isSubmitting"
            :aria-label="t('nlForm.submit')"
          >
            <span
              v-if="!isSubmitting"
              class="i-mdi-send-outline inline-nl-pr-form__icon"
              aria-hidden="true"
            />
          </PuButton>
        </div>
      </PuFormItem>
    </Field>

    <PuInlineNotice
      v-if="voiceErrorMessage"
      tone="error"
      :message="voiceErrorMessage"
    />

    <PuInlineNotice
      v-if="createMutation.isError.value"
      tone="error"
      dismissible
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
import { useLandingTypewriterPlaceholder } from "@/domains/landing/use-cases/useLandingTypewriterPlaceholder";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import { useNaturalLanguageDraftStore } from "@/domains/pr/use-cases/useNaturalLanguageDraft";
import { useWeChatVoiceInput } from "@/shared/wechat/useWeChatVoiceInput";
import {
  PuButton,
  PuForm,
  PuFormItem,
  PuInlineNotice,
  PuInput,
} from "@partner-up-dev/design-web";

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
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.inline-nl-pr-form__field {
  width: 100%;
}

.inline-nl-pr-form__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: stretch;
  gap: var(--sys-spacing-small);
  width: 100%;
}

.inline-nl-pr-form__input {
  min-width: 0;
}

.inline-nl-pr-form__voice-action,
.inline-nl-pr-form__submit-action {
  min-width: 2.75rem;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
}

.inline-nl-pr-form__icon {
  @include mx.pu-icon(small, true);
}

@media (max-width: 480px) {
  .inline-nl-pr-form__controls {
    gap: var(--sys-spacing-xsmall);
  }
}
</style>
