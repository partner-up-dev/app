<template>
  <PuModal :open="open" :title="questionnaire?.title ?? '活动反馈'" @close="$emit('close')">
    <PuInlineNotice
      v-if="errorMessage"
      class="feedback-questionnaire-modal__error"
      tone="error"
      :message="errorMessage"
      data-testid="pr-detail.feedback.error"
    />
    <FeedbackQuestionnaireForm
      v-if="questionnaire"
      :instance-id="questionnaire.instanceId"
      :definition="questionnaire.definition"
      :pending="pending"
      @submit="$emit('submit', $event)"
      @cancel="$emit('close')"
    />
  </PuModal>
</template>

<script setup lang="ts">
import { PuInlineNotice, PuModal } from "@partner-up-dev/design-web";
import type { FeedbackQuestionnaireAnswers } from "@partner-up-dev/backend/contracts";
import type { PRDetailView } from "@/domains/pr/model/types";
import FeedbackQuestionnaireForm from "@/domains/feedback/ui/FeedbackQuestionnaireForm.vue";

defineProps<{
  open: boolean;
  questionnaire: PRDetailView["feedbackQuestionnaire"];
  pending: boolean;
  errorMessage: string | null;
}>();

defineEmits<{
  close: [];
  submit: [answers: FeedbackQuestionnaireAnswers];
}>();
</script>

<style lang="scss" scoped>
.feedback-questionnaire-modal__error {
  margin-block-end: var(--sys-spacing-medium);
}
</style>
