<template>
  <PuModal
    :open="open"
    :title="questionnaire?.title ?? '活动反馈'"
    @close="$emit('close')"
  >
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
import { PuModal } from "@partner-up-dev/design-web";
import type { FeedbackQuestionnaireAnswers } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import FeedbackQuestionnaireForm from "@/domains/feedback/ui/FeedbackQuestionnaireForm.vue";

defineProps<{
  open: boolean;
  questionnaire: PRDetailView["feedbackQuestionnaire"];
  pending: boolean;
}>();

defineEmits<{
  close: [];
  submit: [answers: FeedbackQuestionnaireAnswers];
}>();
</script>
