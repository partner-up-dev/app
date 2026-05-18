<template>
  <section
    v-if="showActionArea"
    class="contextual-area"
    data-region="waitlist-actions"
    data-testid="pr-detail.waitlist-actions"
  >
    <InlineNotice
      v-if="waitlistBlockedMessage"
      tone="warning"
      :message="waitlistBlockedMessage"
    />

    <InlineNotice
      v-if="waitlistNoticeText"
      tone="info"
      :message="waitlistNoticeText"
      data-testid="pr-detail.waitlist.notice"
    />

    <PRWaitlistFlow
      ref="waitlistFlowRef"
      :pr-id="pr.id"
      :disabled="!showWaitlistAction"
      :scenario-type="pr.core.type"
      :event-id="joinEntryContext.routeEventId"
      :entry-surface="joinEntryContext.joinEntrySurface"
      :confirmation-deadline-at="confirmationDeadlineAt"
      :viewer-is-participant="viewer.isParticipant"
      write-join-entry-on-auth
    >
      <template #default="{ open, pending, disabled, joined, errorMessage }">
        <div v-if="showWaitlistAction" class="primary-action">
          <Button
            class="primary-action__button"
            tone="primary"
            :disabled="disabled"
            :loading="pending"
            block
            data-testid="pr-detail.waitlist.open"
            @click="handleWaitlistAction(open, pending, disabled)"
          >
            {{
              joined
                ? t("prPage.waitlisted")
                : pending
                  ? t("prPage.waitlisting")
                  : t("prPage.waitlist")
            }}
          </Button>
          <p v-if="errorMessage" class="action-error">
            {{ errorMessage }}
          </p>
        </div>
      </template>
    </PRWaitlistFlow>

    <div v-if="showCancelWaitlistAction" class="secondary-action">
      <Button
        tone="surface"
        :loading="cancelWaitlistMutation.isPending.value"
        block
        @click="requestCancelWaitlistWithConfirm"
      >
        {{
          cancelWaitlistMutation.isPending.value
            ? t("prPage.cancelWaitlisting")
            : t("prPage.cancelWaitlist")
        }}
      </Button>
      <p v-if="cancelWaitlistActionError" class="action-error">
        {{ cancelWaitlistActionError }}
      </p>
    </div>

    <ConfirmDialog
      :open="showCancelWaitlistConfirmModal"
      :title="t('prPage.cancelWaitlistConfirm.title')"
      :message="t('prPage.cancelWaitlistConfirm.message')"
      :confirm-label="
        cancelWaitlistMutation.isPending.value
          ? t('prPage.cancelWaitlisting')
          : t('prPage.cancelWaitlist')
      "
      confirm-tone="danger"
      :loading="cancelWaitlistMutation.isPending.value"
      @close="showCancelWaitlistConfirmModal = false"
      @confirm="confirmCancelWaitlist"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import type { PRJoinEntryContext } from "@/domains/pr/model/pr-join-entry-context";
import Button from "@/shared/ui/actions/Button.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import ConfirmDialog from "@/shared/ui/overlay/ConfirmDialog.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import PRWaitlistFlow from "@/domains/pr/ui/composites/PRWaitlistFlow.vue";
import { useCancelWaitlistPR } from "@/domains/pr/queries/usePRActions";
import { usePRActionCopy } from "@/domains/pr/use-cases/usePRActionCopy";
import {
  trackPRPrimaryActionClick,
  usePRPrimaryActionImpression,
} from "@/domains/pr/use-cases/usePRPrimaryActionTelemetry";

type WaitlistFlowExpose = {
  open: () => Promise<void>;
};

const props = defineProps<{
  pr: PRDetailView;
  joinEntryContext: PRJoinEntryContext;
}>();

const { t } = useI18n();
const prDetail = computed(() => props.pr);
const viewer = computed(() => props.pr.partnerSection.viewer);
const waitlistFlowRef = ref<WaitlistFlowExpose | null>(null);
const showCancelWaitlistConfirmModal = ref(false);
const cancelWaitlistActionError = ref<string | null>(null);
const cancelWaitlistMutation = useCancelWaitlistPR();
const { blockedReasonText } = usePRActionCopy(prDetail);

const confirmationDeadlineAt = computed(
  () => props.pr.partnerSection.timeline?.confirmationEndAt ?? null,
);

const showWaitlistAction = computed(
  () =>
    !viewer.value.isCreator &&
    !viewer.value.isParticipant &&
    !viewer.value.isWaitlisted &&
    viewer.value.canWaitlist,
);

const waitlistNoticeText = computed(() => {
  if (!viewer.value.isWaitlisted) return null;
  if (viewer.value.waitlistRank !== null) {
    return t("prPage.waitlistRankNotice", { rank: viewer.value.waitlistRank });
  }
  return t("prPage.waitlistedNotice");
});

const waitlistBlockedMessage = computed(() => {
  if (
    viewer.value.isParticipant ||
    viewer.value.isWaitlisted ||
    viewer.value.canJoin ||
    viewer.value.canWaitlist ||
    viewer.value.joinBlockedReason !== "FULL"
  ) {
    return null;
  }
  return blockedReasonText(viewer.value.waitlistBlockedReason);
});

const showCancelWaitlistAction = computed(() => viewer.value.isWaitlisted);

const showActionArea = computed(() =>
  Boolean(
    waitlistBlockedMessage.value ||
      waitlistNoticeText.value ||
      showWaitlistAction.value ||
      showCancelWaitlistAction.value,
  ),
);

usePRPrimaryActionImpression({
  pr: prDetail,
  ctaType: computed(() => (showWaitlistAction.value ? "WAITLIST" : null)),
  visible: showWaitlistAction,
});

useBodyScrollLock(computed(() => showCancelWaitlistConfirmModal.value));

const openWaitlistFlow = async (): Promise<void> => {
  await nextTick();
  await waitlistFlowRef.value?.open();
};

const handleWaitlistAction = (
  open: () => Promise<void>,
  pending: boolean,
  disabled: boolean,
): void => {
  if (pending || disabled) return;
  trackPRPrimaryActionClick(props.pr, "WAITLIST");
  void open();
};

const requestCancelWaitlistWithConfirm = (): void => {
  cancelWaitlistActionError.value = null;
  if (!showCancelWaitlistAction.value) return;
  showCancelWaitlistConfirmModal.value = true;
};

const confirmCancelWaitlist = async (): Promise<void> => {
  cancelWaitlistActionError.value = null;
  try {
    await cancelWaitlistMutation.mutateAsync({ id: props.pr.id });
    showCancelWaitlistConfirmModal.value = false;
  } catch (error) {
    cancelWaitlistActionError.value =
      error instanceof Error ? error.message : t("errors.cancelWaitlistFailed");
  }
};

const replayWaitlist = async (): Promise<void> => {
  if (viewer.value.isParticipant || viewer.value.isWaitlisted) return;
  if (!viewer.value.canWaitlist) return;
  await openWaitlistFlow();
};

defineExpose({
  replayWaitlist,
});
</script>

<style lang="scss" scoped>
.contextual-area {
  margin-top: var(--sys-spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.primary-action,
.secondary-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.primary-action__button {
  max-width: 100%;
}

.action-error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}
</style>
