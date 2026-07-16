<template>
  <BentoItem
    id="pr-type-config-completion"
    :title="title"
    span="full"
    data-testid="admin-pr-type-config.slice.completion"
  >
    <NumberField
      :label="feedbackTemplateLabel"
      :value="completion.feedbackQuestionnaireTemplateId"
      :min="1"
      @update="updateNumber"
    />
    <p v-if="numberError" class="error-text">{{ numberError }}</p>
    <div v-if="existing" class="actions actions--inline slice-actions">
      <PuButton
        :disabled="pending || Boolean(numberError)"
        data-testid="admin-pr-type-config.slice.completion.save"
        @click="$emit('save')"
      >
        {{ pending ? savingLabel : saveLabel }}
      </PuButton>
      <PuInlineNotice v-if="error" tone="error" :message="error" />
    </div>
  </BentoItem>
</template>

<script setup lang="ts">
import { PuButton, PuInlineNotice } from "@partner-up-dev/design-web";
import { ref } from "vue";
import { normalizeNullableNumber } from "@/domains/admin/model/pr-type-config-editor";
import type { AdminPRTypeConfigCompletion } from "@/domains/admin/queries/useAdminPRTypeConfigs";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import NumberField from "./PRTypeConfigNumberField.vue";

const props = defineProps<{
  title: string;
  feedbackTemplateLabel: string;
  savingLabel: string;
  saveLabel: string;
  completion: AdminPRTypeConfigCompletion;
  existing: boolean;
  pending: boolean;
  error?: string;
}>();
const emit = defineEmits<{
  "update:completion": [value: AdminPRTypeConfigCompletion];
  "validation-change": [invalid: boolean];
  save: [];
}>();
const numberError = ref("");
const updateNumber = (value: string | number | null) => {
  const normalized = normalizeNullableNumber(value);
  if (normalized === undefined || (normalized !== null && normalized < 1)) {
    numberError.value = "请输入正整数或留空";
    emit("validation-change", true);
    return;
  }
  numberError.value = "";
  emit("validation-change", false);
  emit("update:completion", { ...props.completion, feedbackQuestionnaireTemplateId: normalized });
};
</script>
