<template>
  <PageScaffold class="pr-page" data-page="pr-detail">
    <LoadingIndicator v-if="isLoading" :message="t('common.loading')" />
    <ErrorToast v-else-if="error" :message="error.message" persistent />

    <template v-else-if="prDetail">
      <PageHeader
        :title="prDisplayTitle"
        :back-fallback-to="backFallbackTo"
        data-region="summary"
      >
        <template #top-actions>
          <div v-if="showHeaderQuickActions" class="header-quick-actions">
            <Button
              v-if="showEditContentAction"
              tone="outline"
              size="sm"
              type="button"
              data-testid="pr-detail.creator.edit-content"
              @click="openEditContentModal"
            >
              {{ t("prPage.editContent") }}
            </Button>
            <Button
              v-if="showModifyStatusAction"
              tone="outline"
              size="sm"
              type="button"
              data-testid="pr-detail.creator.modify-status"
              @click="openModifyStatusModal"
            >
              {{ t("prPage.modifyStatus") }}
            </Button>
          </div>
        </template>

        <template #meta>
          <span class="type-badge">{{ prDetail.core.type || "-" }}</span>
          <PRStatusBadge :status="prDetail.status" />
        </template>
      </PageHeader>

      <Modal
        v-if="showEditContentModal && id !== null && editableFields"
        :open="showEditContentModal"
        max-width="480px"
        :title="t('editContentModal.title')"
        @close="closeEditContentModal"
      >
        <PRForm
          ref="editContentFormRef"
          :initial-fields="editableFields"
          :show-budget-field="showBudgetField"
          :show-time-field="showTimeField"
          :type-editable="false"
          @submit="handleEditContentSubmit"
        />

        <div class="creator-modal-actions creator-modal-actions--spaced">
          <Button
            type="button"
            tone="outline"
            @click="closeEditContentModal"
          >
            {{ t("common.cancel") }}
          </Button>
          <Button
            type="button"
            :loading="editContentPending"
            :disabled="!isEditContentFormValid"
            @click="submitEditContentForm"
          >
            {{ t("editContentModal.confirmAction") }}
          </Button>
        </div>

        <ErrorToast
          v-if="hasEditContentError"
          :message="editContentError?.message || t('editContentModal.updateFailed')"
          @close="resetContentUpdate"
        />
      </Modal>

      <Modal
        v-if="showModifyStatusModal && id !== null"
        :open="showModifyStatusModal"
        max-width="360px"
        :title="t('modifyStatusModal.title')"
        @close="closeModifyStatusModal"
      >
        <UpdatePRStatusForm
          ref="updateStatusFormRef"
          :disabled="updateStatusPending"
          @submit="handleUpdateStatusSubmit"
        />

        <div class="creator-modal-actions">
          <Button tone="outline" @click="closeModifyStatusModal">
            {{ t("common.cancel") }}
          </Button>
          <Button
            :loading="updateStatusPending"
            @click="submitUpdateStatusForm"
          >
            {{ t("modifyStatusModal.confirmAction") }}
          </Button>
        </div>

        <ErrorToast
          v-if="hasUpdateStatusError"
          :message="updateStatusError?.message || t('modifyStatusModal.updateFailed')"
          @close="resetStatusUpdate"
        />
      </Modal>

      <PRDraftPublishNotice
        ref="creatorPublishNoticeRef"
        :pr-id="id"
        :pr="prDetail"
        @published="handlePRActionSuccess"
      />

      <InlineNotice
        v-if="showEventAssistedCreateHandoffNotice"
        tone="success"
        data-testid="pr-detail.event-assisted-create.notice"
        :title="t('prPage.eventAssistedCreateHandoff.title')"
        :message="t('prPage.eventAssistedCreateHandoff.description')"
      />

      <div
        ref="factsCardTargetRef"
        class="facts-card"
        :class="{ 'facts-card--handoff-hidden': shouldHideFactsForHandoff }"
        data-region="summary"
      >
        <PRFactsCard :pr-id="prDetail.id" @ready="handleFactsCardReady" />
      </div>

      <PRContextualActions
        ref="contextualActionsRef"
        :pr-id="id"
        :pr="prDetail"
        :route-event-id="routeEventId"
        :join-entry-surface="joinEntrySurface"
        :confirmation-deadline-at="confirmationDeadlineAt"
        :supports-event-context-features="supportsEventContextFeatures"
        @action-success="handlePRActionSuccess"
      />

      <PRUtilityActions
        :pr-id="id"
        :pr="prDetail"
        :supports-event-context-features="supportsEventContextFeatures"
      />
    </template>

    <MiniumCommonFooter data-region="support" />
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, isRef, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRStatusManual } from "@partner-up-dev/backend";
import type { PartnerRequestFormInput } from "@/lib/validation";
import Button from "@/shared/ui/actions/Button.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import MiniumCommonFooter from "@/domains/support/ui/sections/MiniumCommonFooter.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";
import PRFactsCard from "@/domains/pr/ui/composites/PRFactsCard.vue";
import PRContextualActions from "@/domains/pr/ui/sections/PRContextualActions.vue";
import PRDraftPublishNotice from "@/domains/pr/ui/sections/PRDraftPublishNotice.vue";
import PRUtilityActions from "@/domains/pr/ui/sections/PRUtilityActions.vue";
import PRForm from "@/domains/pr/ui/forms/PRForm.vue";
import UpdatePRStatusForm from "@/domains/pr/ui/forms/UpdatePRStatusForm.vue";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { usePRDetailHead } from "@/domains/pr/use-cases/usePRDetailHead";
import { usePRRouteShareDescriptor } from "@/domains/pr/use-cases/usePRRouteShareDescriptor";
import { usePRLivePolling } from "@/domains/pr/use-cases/usePRLivePolling";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import { usePRCreatorActions } from "@/domains/pr/use-cases/usePRCreatorActions";
import { useRouteShareDescriptorRegistration } from "@/domains/share/use-cases/route-share-controller";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import { buildRouteSummary } from "@/domains/route/model/route";
import { trackEvent } from "@/shared/telemetry/track";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
  type PendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import { useMatchedPRHandoff } from "@/processes/route-handoff/useMatchedPRHandoff";

type ContextualPendingActionKind = Extract<
  PendingWeChatAction["kind"],
  "PR_JOIN" | "PR_WAITLIST" | "PR_EXIT" | "PR_CONFIRM"
>;
type PRContextualActionsExpose = {
  replayPendingAction: (kind: ContextualPendingActionKind) => Promise<void>;
};
type PRDraftPublishNoticeExpose = {
  replayPublishDraft: () => Promise<void>;
};
type CreatorSecondaryActionType =
  | "CREATOR_EDIT_CONTENT"
  | "CREATOR_MODIFY_STATUS";
type ReplayablePendingAction = Extract<
  PendingWeChatAction,
  { kind: ContextualPendingActionKind | "PR_PUBLISH" }
>;

const route = useRoute();
const { t } = useI18n();
const id = usePRRouteId();
const { data, isLoading, error, refetch } = usePRDetail(id);
const prDetail = computed(() => data.value);
const factsCardTargetRef = ref<HTMLElement | null>(null);
const editContentFormRef = ref<InstanceType<typeof PRForm> | null>(null);
const updateStatusFormRef =
  ref<InstanceType<typeof UpdatePRStatusForm> | null>(null);
const contextualActionsRef = ref<PRContextualActionsExpose | null>(null);
const creatorPublishNoticeRef = ref<PRDraftPublishNoticeExpose | null>(null);
const pendingActionReplayRunning = ref(false);
const showEditContentModal = ref(false);
const showModifyStatusModal = ref(false);
const matchedPRHandoff = useMatchedPRHandoff();

const prDisplayTitle = computed(() => {
  const explicitTitle = prDetail.value?.title?.trim() ?? "";
  if (explicitTitle.length > 0) return explicitTitle;
  const place =
    prDetail.value?.core.placeDisplayName?.trim() ??
    buildRouteSummary(prDetail.value?.core.route) ??
    prDetail.value?.core.location?.trim() ??
    "";
  if (place.length > 0) return place;
  const type = prDetail.value?.core.type?.trim() ?? "";
  if (type.length > 0) return type;
  return t("prPage.displayFallbackTitle");
});
const confirmationDeadlineAt = computed(
  () => prDetail.value?.partnerSection.timeline?.confirmationEndAt ?? null,
);
const supportsEventContextFeatures = computed(
  () => prDetail.value?.partnerSection.reminder.supported ?? false,
);
const routeEventId = computed(() => {
  const routeEventIdRaw = route.query.fromEvent;
  const routeEventId =
    typeof routeEventIdRaw === "string" ? Number(routeEventIdRaw) : null;
  if (
    routeEventId !== null &&
    Number.isFinite(routeEventId) &&
    routeEventId > 0
  ) {
    return routeEventId;
  }
  return null;
});
const backFallbackTo = computed(() => {
  if (routeEventId.value !== null) {
    return `/e/${routeEventId.value}?mode=list`;
  }
  return "/";
});
const handoffEntry = computed(() => {
  const raw = route.query.handoff;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return null;
});
const joinEntrySurface = computed(() =>
  handoffEntry.value === "matched_pr" ? "form_mode_matched" : "pr_detail",
);
const showEventAssistedCreateHandoffNotice = computed(
  () =>
    (prDetail.value?.partnerSection.viewer.isCreator ?? false) &&
    handoffEntry.value === "event_assisted_create",
);

const {
  editableFields,
  showBudgetField,
  showTimeField,
  showEditContentAction,
  showModifyStatusAction,
  showHeaderQuickActions,
  editContentPending,
  editContentError,
  hasEditContentError,
  updateStatusPending,
  updateStatusError,
  hasUpdateStatusError,
  submitContentUpdate,
  submitStatusUpdate,
  resetContentUpdate,
  resetStatusUpdate,
} = usePRCreatorActions({
  id,
  pr: prDetail,
  supportsEventContextFeatures,
});

const isEditContentFormValid = computed(() => {
  const canSubmit = editContentFormRef.value?.canSubmit;
  return isRef(canSubmit) ? canSubmit.value : Boolean(canSubmit);
});

useBodyScrollLock(
  computed(() => showEditContentModal.value || showModifyStatusModal.value),
);

const { resetLivePolling } = usePRLivePolling({
  id,
  refetch,
});
const { shareUrl, spmRouteKey } = usePRShareContext({
  id,
  pr: prDetail,
});
const routeShareDescriptor = usePRRouteShareDescriptor({
  id,
  pr: prDetail,
  spmRouteKey,
});
usePRDetailHead({ pr: prDetail, shareUrl });
useRouteShareDescriptorRegistration(routeShareDescriptor);

const handlePRActionSuccess = () => {
  resetLivePolling();
  void refetch();
};

const trackCreatorActionClick = (actionType: CreatorSecondaryActionType) => {
  if (id.value === null || !supportsEventContextFeatures.value) return;
  trackEvent("pr_secondary_action_click", {
    prId: id.value,
    actionType,
  });
};

const openEditContentModal = () => {
  resetContentUpdate();
  trackCreatorActionClick("CREATOR_EDIT_CONTENT");
  showEditContentModal.value = true;
};

const closeEditContentModal = () => {
  showEditContentModal.value = false;
  resetContentUpdate();
};

const submitEditContentForm = () => {
  editContentFormRef.value?.submitForm();
};

const handleEditContentSubmit = async (
  payload: PartnerRequestFormInput,
): Promise<void> => {
  await submitContentUpdate(payload);
  closeEditContentModal();
};

const openModifyStatusModal = () => {
  resetStatusUpdate();
  trackCreatorActionClick("CREATOR_MODIFY_STATUS");
  showModifyStatusModal.value = true;
};

const closeModifyStatusModal = () => {
  showModifyStatusModal.value = false;
  resetStatusUpdate();
};

const submitUpdateStatusForm = () => {
  updateStatusFormRef.value?.submitForm();
};

const handleUpdateStatusSubmit = async (
  status: PRStatusManual,
): Promise<void> => {
  await submitStatusUpdate(status);
  closeModifyStatusModal();
};

const shouldHideFactsForHandoff = computed(() =>
  matchedPRHandoff.shouldHideTargetForPR(id.value),
);

const registerFactsCardTarget = () => {
  if (id.value === null || !matchedPRHandoff.isActiveForPR(id.value)) {
    return;
  }

  const target = factsCardTargetRef.value;
  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  matchedPRHandoff.registerTargetRect(id.value, {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  });
};

const handleFactsCardReady = async () => {
  await nextTick();
  registerFactsCardTarget();
};

watch(
  [() => matchedPRHandoff.state.phase, id, () => prDetail.value?.id ?? null],
  async () => {
    await nextTick();
    registerFactsCardTarget();
  },
  { immediate: true },
);

const matchPendingActionForCurrentPR = (
  pending: PendingWeChatAction | null,
): ReplayablePendingAction | null => {
  if (!pending || id.value === null) {
    return null;
  }
  if (
    pending.kind === "PR_JOIN" ||
    pending.kind === "PR_WAITLIST" ||
    pending.kind === "PR_EXIT" ||
    pending.kind === "PR_CONFIRM" ||
    pending.kind === "PR_PUBLISH"
  ) {
    return pending.prId === id.value ? pending : null;
  }
  return null;
};

const attemptPendingWeChatActionReplay = async () => {
  if (pendingActionReplayRunning.value) return;
  if (id.value === null || !prDetail.value) return;

  const pending = matchPendingActionForCurrentPR(readPendingWeChatAction());
  if (!pending) return;

  pendingActionReplayRunning.value = true;
  clearPendingWeChatAction();
  try {
    if (pending.kind === "PR_PUBLISH") {
      await creatorPublishNoticeRef.value?.replayPublishDraft();
      return;
    }

    await contextualActionsRef.value?.replayPendingAction(pending.kind);
  } finally {
    pendingActionReplayRunning.value = false;
  }
};

watch(
  () =>
    [
      id.value,
      prDetail.value?.partnerSection.viewer.isParticipant,
      prDetail.value?.partnerSection.viewer.isWaitlisted,
      prDetail.value?.partnerSection.viewer.canJoin,
      prDetail.value?.partnerSection.viewer.canWaitlist,
      prDetail.value?.partnerSection.viewer.canExit,
      prDetail.value?.partnerSection.viewer.canConfirm,
      prDetail.value?.status,
    ] as const,
  () => {
    void attemptPendingWeChatActionReplay();
  },
  { immediate: true },
);

onMounted(() => {
  void attemptPendingWeChatActionReplay();
});
</script>

<style lang="scss" scoped>
.header-quick-actions {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
}

.creator-modal-actions {
  display: flex;
  gap: var(--sys-spacing-small);

  :deep(.ui-button) {
    flex: 1;
    min-width: 66px;
  }
}

.creator-modal-actions--spaced {
  margin-top: var(--sys-spacing-large);
}

.type-badge {
  @include mx.pu-font(label-medium);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.facts-card {
  margin-top: var(--sys-spacing-large);
}

.facts-card--handoff-hidden {
  visibility: hidden;
}

@media (max-width: 375px) {
  .header-quick-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
