<template>
  <div class="user-phone-number-editor">
    <PuFormItem
      :label="label"
      :for-id="inputId"
      :hint="hintText"
      :error="draftError ?? undefined"
      :required="required"
    >
      <div class="user-phone-number-editor__controls">
        <PuInput
          :id="inputId"
          v-model="phoneDraft"
          class="user-phone-number-editor__input"
          native-type="tel"
          inputmode="numeric"
          autocomplete="tel"
          :maxlength="11"
          clearable
          :placeholder="placeholder"
          :disabled="fieldDisabled"
          :data-testid="`${dataTestidPrefix}.input`"
          @keydown.enter.prevent="handleSave"
        />
        <PuButton
          class="user-phone-number-editor__submit"
          shape="pill"
          size="sm"
          :disabled="!canSavePhoneNumber"
          :loading="submitPending"
          :data-testid="`${dataTestidPrefix}.save`"
          @click="handleSave"
        >
          {{ resolvedSubmitLabel }}
        </PuButton>
      </div>
    </PuFormItem>

    <PuInlineNotice
      v-if="mutationErrorMessage"
      tone="error"
      :message="mutationErrorMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { PuButton, PuFormItem, PuInlineNotice, PuInput } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  isMainlandChinaMobilePhone,
  normalizeUserPhoneNumberDraft,
} from "@/domains/user/model/phone-number";
import { useUpdateCurrentUserPhoneNumber } from "@/domains/user/queries/useUpdateCurrentUserPhoneNumber";

const props = withDefaults(
  defineProps<{
    id?: string;
    label?: string;
    placeholder?: string;
    submitLabel?: string;
    currentPhoneMasked?: string | null;
    hasPhoneNumber?: boolean;
    allowClear?: boolean;
    required?: boolean;
    disabled?: boolean;
    externalLoading?: boolean;
    dataTestidPrefix?: string;
  }>(),
  {
    id: "user-phone-number",
    label: undefined,
    placeholder: undefined,
    submitLabel: undefined,
    currentPhoneMasked: null,
    hasPhoneNumber: false,
    allowClear: true,
    required: false,
    disabled: false,
    externalLoading: false,
    dataTestidPrefix: "user.phone",
  },
);

const emit = defineEmits<{
  saved: [value: { phoneNumber: string | null }];
}>();

const { t } = useI18n();
const updatePhoneNumberMutation = useUpdateCurrentUserPhoneNumber();
const phoneDraft = ref("");
const submitted = ref(false);

const inputId = computed(() => props.id);
const label = computed(() => props.label ?? t("mePage.profile.phoneLabel"));
const placeholder = computed(() => props.placeholder ?? t("mePage.profile.phonePlaceholder"));
const resolvedSubmitLabel = computed(() => props.submitLabel ?? t("mePage.profile.savePhone"));
const normalizedPhoneDraft = computed(() => normalizeUserPhoneNumberDraft(phoneDraft.value));
const submitPending = computed(
  () => updatePhoneNumberMutation.isPending.value || props.externalLoading,
);
const fieldDisabled = computed(() => props.disabled || submitPending.value);

const draftError = computed(() => {
  const value = normalizedPhoneDraft.value;
  if (!value) {
    return props.required && submitted.value ? t("mePage.profile.phoneInvalid") : null;
  }
  return isMainlandChinaMobilePhone(value) ? null : t("mePage.profile.phoneInvalid");
});

const canSavePhoneNumber = computed(() => {
  const value = normalizedPhoneDraft.value;
  const canClear = props.allowClear && props.hasPhoneNumber && value.length === 0;
  return (
    !fieldDisabled.value &&
    draftError.value === null &&
    (isMainlandChinaMobilePhone(value) || canClear)
  );
});

const hintText = computed(() => {
  if (draftError.value) return draftError.value;
  if (props.currentPhoneMasked) {
    return t("mePage.profile.phoneCurrent", {
      phone: props.currentPhoneMasked,
    });
  }
  return t("mePage.profile.phoneHint");
});

const mutationErrorMessage = computed(() => {
  const error = updatePhoneNumberMutation.error.value;
  return error instanceof Error ? error.message : null;
});

const handleSave = async (): Promise<void> => {
  submitted.value = true;
  if (!canSavePhoneNumber.value) return;

  const phoneNumber = normalizedPhoneDraft.value || null;
  await updatePhoneNumberMutation.mutateAsync({ phoneNumber });
  phoneDraft.value = "";
  submitted.value = false;
  emit("saved", { phoneNumber });
};
</script>

<style scoped lang="scss">
.user-phone-number-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.user-phone-number-editor__controls {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--sys-spacing-small);
}

.user-phone-number-editor__input {
  flex: 1 1 12rem;
  min-width: min(100%, 12rem);
}

.user-phone-number-editor__submit {
  flex: 0 0 auto;
}
</style>
