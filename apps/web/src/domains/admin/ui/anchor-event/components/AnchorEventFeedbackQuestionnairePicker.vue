<template>
  <PuFormItem
    :label="t('adminPR.eventFeedbackQuestionnaireTemplateLabel')"
    for-id="anchor-event-feedback-template"
  >
    <PuSelect
      id="anchor-event-feedback-template"
      v-model="feedbackTemplateId"
      :options="templateOptions"
      :placeholder="t('adminPR.noFeedbackQuestionnaire')"
      clearable
      data-testid="admin-anchor-event.feedback-template"
    />
  </PuFormItem>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type {
  AnchorEventEditorForm,
  FeedbackQuestionnaireTemplateOption,
} from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import {
  PuFormItem,
  PuSelect,
  type PuSelectOption,
  type PuSelectValue,
} from "@partner-up-dev/design-web";

const props = defineProps<{
  templates: FeedbackQuestionnaireTemplateOption[];
}>();

const form = defineModel<AnchorEventEditorForm>({ required: true });
const { t } = useI18n();

const templateOptions = computed<PuSelectOption[]>(() =>
  props.templates.map((template) => ({
    label: template.title,
    value: template.id,
  })),
);

const feedbackTemplateId = computed({
  get: () => form.value.feedbackQuestionnaireTemplateId,
  set: (value: PuSelectValue) => {
    form.value.feedbackQuestionnaireTemplateId =
      typeof value === "number" ? value : null;
  },
});
</script>
