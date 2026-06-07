<template>
  <label class="field">
    <span class="field-label">
      {{ t("adminPR.eventFeedbackQuestionnaireTemplateLabel") }}
    </span>
    <select
      class="field-input"
      :value="form.feedbackQuestionnaireTemplateId ?? ''"
      data-testid="admin-anchor-event.feedback-template"
      @change="form.feedbackQuestionnaireTemplateId = parseNullableId($event)"
    >
      <option value="">{{ t("adminPR.noFeedbackQuestionnaire") }}</option>
      <option
        v-for="template in templates"
        :key="template.id"
        :value="template.id"
      >
        {{ template.title }}
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type {
  AnchorEventEditorForm,
  FeedbackQuestionnaireTemplateOption,
} from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";

defineProps<{
  templates: FeedbackQuestionnaireTemplateOption[];
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const parseNullableId = (event: Event): number | null => {
  const target = event.target as HTMLSelectElement | null;
  const parsed = Number(target?.value ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};
</script>

<style lang="scss" scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}
</style>
