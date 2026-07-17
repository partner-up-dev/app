<template>
  <section
    v-if="showActionArea"
    class="action-section"
    data-region="check-in-feedback-actions"
    data-testid="pr-detail.check-in-feedback-actions"
  >
    <div v-if="showCheckInAction" class="action-group">
      <PuButton
        class="action-group__button"
        tone="primary"
        variant="solid"
        :disabled="!viewer.canCheckIn"
        :loading="attendanceActions.checkInPending.value"
        block
        data-testid="pr-detail.participant.check-in-action"
        @click="handleCheckIn"
      >
        {{
          attendanceActions.checkInPending.value
            ? t("prPage.checkingIn")
            : t("prPage.checkInAttended")
        }}
      </PuButton>
      <p v-if="checkInTip" class="action-tip">
        {{ checkInTip }}
      </p>
    </div>

    <div v-if="showFeedbackRetryAction" class="action-group">
      <PuButton
        class="action-group__button"
        tone="primary"
        variant="solid"
        block
        data-testid="pr-detail.feedback.open"
        @click="openFeedbackQuestionnaire"
      >
        {{ t("prPage.feedbackQuestionnaire.openAction") }}
      </PuButton>
    </div>

    <PuInlineNotice
      v-if="showFeedbackSubmitted"
      tone="success"
      message="反馈已提交"
      data-testid="pr-detail.feedback.submitted"
    />

    <p v-if="primaryActionError" class="action-error">
      {{ primaryActionError }}
    </p>

    <PRFeedbackQuestionnaireModal
      :open="feedbackModalOpen"
      :questionnaire="feedbackQuestionnaire"
      :pending="feedbackSubmission.isPending.value"
      :error-message="feedbackSubmission.errorMessage.value"
      @close="feedbackModalOpen = false"
      @submit="submitFeedbackQuestionnaire"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { FeedbackQuestionnaireAnswers } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import { usePRAttendanceActions } from "@/domains/pr/use-cases/usePRAttendanceActions";
import { usePRFeedbackQuestionnaireSubmission } from "@/domains/pr/use-cases/usePRFeedbackQuestionnaireSubmission";
import { usePRActionCopy } from "@/domains/pr/use-cases/usePRActionCopy";
import {
  trackPRPrimaryActionClick,
  usePRPrimaryActionImpression,
} from "@/domains/pr/use-cases/usePRPrimaryActionTelemetry";
import PRFeedbackQuestionnaireModal from "./PRFeedbackQuestionnaireModal.vue";
import { PuButton, PuInlineNotice } from "@partner-up-dev/design-web";

const props = defineProps<{
  pr: PRDetailView;
}>();

const { t } = useI18n();
const prDetail = computed(() => props.pr);
const prId = computed(() => props.pr.id);
const viewer = computed(() => props.pr.partnerSection.viewer);
const primaryActionError = ref<string | null>(null);
const feedbackModalOpen = ref(false);
const { resolveCheckInTip } = usePRActionCopy(prDetail);
const feedbackSubmission = usePRFeedbackQuestionnaireSubmission(prId);

const attendanceActions = usePRAttendanceActions({
  id: prId,
  pr: prDetail,
});

const feedbackQuestionnaire = computed(() => props.pr.feedbackQuestionnaire);
const hasPendingFeedbackQuestionnaire = computed(
  () => feedbackQuestionnaire.value?.responseState.status === "NOT_SUBMITTED",
);

const showCheckInAction = computed(
  () =>
    viewer.value.isParticipant &&
    (viewer.value.slotState === "CONFIRMED" ||
      (viewer.value.slotState === "JOINED" &&
        !props.pr.partnerSection.confirmation.enabled &&
        viewer.value.canCheckIn)),
);

const checkInTip = computed(() => {
  if (!showCheckInAction.value || viewer.value.canCheckIn) return null;
  return resolveCheckInTip();
});

const showFeedbackRetryAction = computed(
  () => viewer.value.slotState === "ATTENDED" && hasPendingFeedbackQuestionnaire.value,
);
const showFeedbackSubmitted = computed(
  () =>
    viewer.value.slotState === "ATTENDED" &&
    feedbackQuestionnaire.value?.responseState.status === "SUBMITTED",
);

const showActionArea = computed(() =>
  Boolean(
    showCheckInAction.value ||
    showFeedbackRetryAction.value ||
    showFeedbackSubmitted.value ||
    primaryActionError.value,
  ),
);

usePRPrimaryActionImpression({
  pr: prDetail,
  ctaType: computed(() => (showCheckInAction.value ? "CHECK_IN" : null)),
  visible: showCheckInAction,
});

const openFeedbackQuestionnaire = (): void => {
  if (!hasPendingFeedbackQuestionnaire.value) return;
  feedbackSubmission.resetError();
  feedbackModalOpen.value = true;
};

const handleCheckIn = async (): Promise<void> => {
  if (!showCheckInAction.value) return;
  if (!viewer.value.canCheckIn || attendanceActions.checkInPending.value) return;
  primaryActionError.value = null;
  trackPRPrimaryActionClick(props.pr, "CHECK_IN");
  try {
    await attendanceActions.submitCheckIn();
    if (hasPendingFeedbackQuestionnaire.value) {
      feedbackModalOpen.value = true;
    }
  } catch (error) {
    primaryActionError.value =
      error instanceof Error ? error.message : t("errors.checkInSlotFailed");
  }
};

const submitFeedbackQuestionnaire = async (
  answers: FeedbackQuestionnaireAnswers,
): Promise<void> => {
  const questionnaire = feedbackQuestionnaire.value;
  if (!questionnaire) return;
  try {
    await feedbackSubmission.submit({
      instanceId: questionnaire.instanceId,
      answers,
    });
    feedbackModalOpen.value = false;
  } catch {
    // The workflow exposes the command error while the mounted form retains its local draft for retry.
  }
};
</script>

<style lang="scss" scoped>
.action-section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.action-group__button {
  max-width: 100%;
}

.action-tip {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.action-error {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-error);
}
</style>
