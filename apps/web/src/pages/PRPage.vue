<template>
  <PuPageScaffold class="pr-page" data-page="pr-detail">
    <template #pageHeader>
      <PuHeader v-if="prDetail" :title="prDisplayTitle" data-region="summary" title-as="h1">
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.backToHome')"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>

        <template #actions>
          <div v-if="showHeaderQuickActions" class="header-quick-actions">
            <PuButton
              v-if="showEditContentAction"
              tone="neutral"
              variant="outline"
              size="sm"
              data-testid="pr-detail.creator.edit-content"
              @click="openEditContentModal"
            >
              {{ t("prPage.editContent") }}
            </PuButton>
            <PuButton
              v-if="showModifyStatusAction"
              tone="neutral"
              variant="outline"
              size="sm"
              data-testid="pr-detail.creator.modify-status"
              @click="openModifyStatusModal"
            >
              {{ t("prPage.modifyStatus") }}
            </PuButton>
          </div>
        </template>

        <template #meta>
          <div class="pr-header-meta">
            <PuTag
              :text="prDetail.core.type || '-'"
              tone="secondary"
              variant="soft"
              shape="pill"
              size="md"
            />
            <PuTag
              :text="prStatusTagText"
              :tone="prStatusTagTone"
              variant="soft"
              shape="pill"
              size="md"
            />
          </div>
        </template>
      </PuHeader>
    </template>

    <PuLoadingState v-if="isLoading" :message="t('common.loading')" />
    <PuInlineNotice tone="error" v-else-if="error" :message="error.message" />

    <template v-else-if="prDetail">
      <PuModal
        v-if="showEditContentModal && id !== null"
        :open="showEditContentModal"
        max-width="480px"
        :title="t('editContentModal.title')"
        @close="closeEditContentModal"
      >
        <PREditor ref="editorRef" :pr-id="id" @saved="closeEditContentModal" />

        <div class="creator-modal-actions creator-modal-actions--spaced">
          <PuButton tone="neutral" variant="outline" @click="closeEditContentModal">
            {{ t("common.cancel") }}
          </PuButton>
          <PuButton
            :loading="editorPending"
            :disabled="!isEditContentFormValid"
            data-testid="pr-detail.creator.edit-content.submit"
            @click="submitEditContentForm"
          >
            {{ t("editContentModal.confirmAction") }}
          </PuButton>
        </div>
      </PuModal>

      <PuModal
        v-if="showModifyStatusModal && id !== null"
        :open="showModifyStatusModal"
        max-width="360px"
        :title="t('modifyStatusModal.title')"
        @close="closeModifyStatusModal"
      >
        <UpdatePRStatusForm
          ref="updateStatusFormRef"
          :disabled="updateStatusPending"
          :initial-status="updateStatusInitialStatus"
          @submit="handleUpdateStatusSubmit"
        />

        <div class="creator-modal-actions">
          <PuButton tone="neutral" variant="outline" @click="closeModifyStatusModal">
            {{ t("common.cancel") }}
          </PuButton>
          <PuButton :loading="updateStatusPending" @click="submitUpdateStatusForm">
            {{ t("modifyStatusModal.confirmAction") }}
          </PuButton>
        </div>

        <PuInlineNotice
          tone="error"
          dismissible
          v-if="hasUpdateStatusError"
          :message="updateStatusError?.message || t('modifyStatusModal.updateFailed')"
          @close="resetStatusUpdate"
        />
      </PuModal>

      <PRDraftPublishNotice :pr-id="id" :pr="prDetail" />

      <div
        ref="factsCardTargetRef"
        class="facts-card"
        :class="{ 'facts-card--handoff-hidden': shouldHideFactsForHandoff }"
        data-region="summary"
      >
        <PRFactsCard :pr-id="prDetail.id" @ready="handleFactsCardReady" />
      </div>

      <div class="primary-stack" data-region="primary-actions">
        <PRWaitlistActions :pr="prDetail" />

        <PRConfirmationAction :pr="prDetail" />

        <PRCheckInFeedbackActions :pr="prDetail" />

        <PRJoinAction
          :pr="prDetail"
          entry-surface="pr_detail"
          @success-closed="handleJoinSuccessClosed"
        />

        <PRExitAction :pr="prDetail" />
      </div>

      <div class="utility-stack" data-region="utility">
        <div class="utility-action-row">
          <PRTypeCommunityEntryAction :type="prDetail.core.type" />
          <PRMessageThreadAction :pr="prDetail" />
          <PRPairingCodeAction :pr="prDetail" />
          <PRStudySprintPomodoroAction :pr="prDetail" />
          <ButtonPlacement
            v-if="canMountButtonPlacement && placementMatchingContext"
            :matching-context="placementMatchingContext"
          />
        </div>

        <PRShareAction
          :pr="prDetail"
          :share-url="shareUrl"
          :spm-route-key="spmRouteKey"
          :pr-share-data="prShareData"
        />

        <PRDiscoveryEntryLink v-if="prDetail.partnerSection.reminder.supported" />
      </div>

      <PRNotificationSubscriptionsSection
        class="notification-subscriptions-region"
        :pr="prDetail"
      />
    </template>

    <PageFooter variant="minimal" data-region="support" />
  </PuPageScaffold>
</template>

<script setup lang="ts">
import type { PRStatusManual } from "@partner-up-dev/backend/contracts";
import {
  PuButton,
  PuHeader,
  PuInlineNotice,
  PuLoadingState,
  PuModal,
  PuPageScaffold,
  PuTag,
} from "@partner-up-dev/design-web";
import { computed, isRef, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import ButtonPlacement from "@/domains/commerce/ui/ButtonPlacement.vue";
import { resolvePRDisplayStatus } from "@/domains/pr/model/pr-display-status";
import { resolvePRStatusTagText, resolvePRStatusTagTone } from "@/domains/pr/model/pr-status-tag";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import PRFactsCard from "@/domains/pr/ui/composites/PRFactsCard.vue";
import PREditor from "@/domains/pr/ui/forms/PREditor.vue";
import UpdatePRStatusForm from "@/domains/pr/ui/forms/UpdatePRStatusForm.vue";
import PRCheckInFeedbackActions from "@/domains/pr/ui/sections/PRCheckInFeedbackActions.vue";
import PRConfirmationAction from "@/domains/pr/ui/sections/PRConfirmationAction.vue";
import PRDiscoveryEntryLink from "@/domains/pr/ui/sections/PRDiscoveryEntryLink.vue";
import PRDraftPublishNotice from "@/domains/pr/ui/sections/PRDraftPublishNotice.vue";
import PRExitAction from "@/domains/pr/ui/sections/PRExitAction.vue";
import PRJoinAction from "@/domains/pr/ui/sections/PRJoinAction.vue";
import PRMessageThreadAction from "@/domains/pr/ui/sections/PRMessageThreadAction.vue";
import PRNotificationSubscriptionsSection from "@/domains/pr/ui/sections/PRNotificationSubscriptionsSection.vue";
import PRPairingCodeAction from "@/domains/pr/ui/sections/PRPairingCodeAction.vue";
import PRShareAction from "@/domains/pr/ui/sections/PRShareAction.vue";
import PRStudySprintPomodoroAction from "@/domains/pr/ui/sections/PRStudySprintPomodoroAction.vue";
import PRTypeCommunityEntryAction from "@/domains/pr/ui/sections/PRTypeCommunityEntryAction.vue";
import PRWaitlistActions from "@/domains/pr/ui/sections/PRWaitlistActions.vue";
import { usePRCreatorActions } from "@/domains/pr/use-cases/usePRCreatorActions";
import { usePRDetailHead } from "@/domains/pr/use-cases/usePRDetailHead";
import {
  providePRPendingReplayRegistry,
  usePRPendingWeChatReplay,
} from "@/domains/pr/use-cases/usePRPendingWeChatReplay";
import { usePRRouteShareDescriptor } from "@/domains/pr/use-cases/usePRRouteShareDescriptor";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import { useRouteShareDescriptorRegistration } from "@/domains/share/use-cases/route-share-controller";
import { useMatchedPRHandoff } from "@/processes/route-handoff/useMatchedPRHandoff";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";
import { trackEvent } from "@/shared/telemetry/track";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";

type CreatorSecondaryActionType = "CREATOR_EDIT_CONTENT" | "CREATOR_MODIFY_STATUS";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();
const { data, isLoading, error } = usePRDetail(id);
const prDetail = computed(() => data.value);
const pendingReplayRegistry = providePRPendingReplayRegistry();
const factsCardTargetRef = ref<HTMLElement | null>(null);
const editorRef = ref<InstanceType<typeof PREditor> | null>(null);
const updateStatusFormRef = ref<InstanceType<typeof UpdatePRStatusForm> | null>(null);
const showEditContentModal = ref(false);
const showModifyStatusModal = ref(false);
const matchedPRHandoff = useMatchedPRHandoff();
const prReadyForPendingReplay = computed(
  () => id.value !== null && prDetail.value !== undefined && prDetail.value !== null,
);

const prDisplayTitle = computed(() => {
  const canonicalTitle = prDetail.value?.share.canonical.title.trim() ?? "";
  if (canonicalTitle.length > 0) return canonicalTitle;
  return t("prPage.displayFallbackTitle");
});
const prDisplayStatus = computed(() => {
  const detail = prDetail.value;
  if (!detail) return "OPEN";
  return resolvePRDisplayStatus(detail.status, detail.partnerSection.capacity);
});
const prStatusTagText = computed(() => resolvePRStatusTagText(prDisplayStatus.value, t));
const prStatusTagTone = computed(() => resolvePRStatusTagTone(prDisplayStatus.value));
const updateStatusInitialStatus = computed<PRStatusManual>(() => {
  const status = prDetail.value?.status;
  if (status === "READY" || status === "ACTIVE" || status === "CLOSED") {
    return status;
  }
  return "OPEN";
});
const { handleBack } = useFallbackBack("/");
const canMountButtonPlacement = computed(
  () => prDetail.value?.partnerSection.viewer.isParticipant ?? false,
);
const placementMatchingContext = computed(() => {
  const pr = prDetail.value;
  if (!pr) return null;
  const routePointCount = pr.core.route?.length ?? 0;
  return {
    kind: "PR",
    prId: pr.id,
    status: pr.status,
    title: pr.title,
    type: pr.core.type,
    time: {
      startAt: pr.core.time[0],
      endAt: pr.core.time[1],
      hasStart: pr.core.time[0] !== null,
      hasEnd: pr.core.time[1] !== null,
      hasConcreteTime: pr.core.time[0] !== null && pr.core.time[1] !== null,
    },
    location: pr.core.location,
    hasLocation: (pr.core.location?.trim() ?? "").length > 0,
    route: pr.core.route,
    routePointCount,
    hasRoute: routePointCount >= 2,
    minPartners: pr.core.minPartners,
    maxPartners: pr.core.maxPartners,
    activeParticipantCount: pr.partnerSection.capacity.current,
    budget: pr.core.budget,
    preferences: pr.core.preferences,
    notes: pr.core.notes,
  };
});

const {
  showEditContentAction,
  showModifyStatusAction,
  showHeaderQuickActions,
  updateStatusPending,
  updateStatusError,
  hasUpdateStatusError,
  submitStatusUpdate,
  resetStatusUpdate,
} = usePRCreatorActions({
  id,
  pr: prDetail,
});

const editorPending = computed(() => {
  const pending = editorRef.value?.isPending;
  return isRef<boolean>(pending) ? pending.value : Boolean(pending);
});

const isEditContentFormValid = computed(() => {
  const canSubmit = editorRef.value?.canSubmit;
  return isRef<boolean>(canSubmit) ? canSubmit.value : Boolean(canSubmit);
});

const { shareUrl, spmRouteKey, prShareData } = usePRShareContext({
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

const trackCreatorActionClick = (actionType: CreatorSecondaryActionType) => {
  if (id.value === null) return;
  trackEvent("pr_secondary_action_click", {
    prId: id.value,
    actionType,
  });
};

const openEditContentModal = () => {
  trackCreatorActionClick("CREATOR_EDIT_CONTENT");
  showEditContentModal.value = true;
};

const closeEditContentModal = () => {
  showEditContentModal.value = false;
};

const submitEditContentForm = () => {
  editorRef.value?.submitForm();
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

const handleUpdateStatusSubmit = async (status: PRStatusManual): Promise<void> => {
  await submitStatusUpdate(status);
  closeModifyStatusModal();
};

const handleJoinSuccessClosed = async (): Promise<void> => {
  if (id.value === null || route.query.entry === "join") {
    return;
  }

  await router.replace({
    path: route.path,
    query: {
      ...route.query,
      entry: "join",
    },
  });
};

const shouldHideFactsForHandoff = computed(() => matchedPRHandoff.shouldHideTargetForPR(id.value));

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

usePRPendingWeChatReplay({
  prId: id,
  ready: prReadyForPendingReplay,
  registry: pendingReplayRegistry,
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

  :deep(.pu-button) {
    flex: 1;
    min-width: 66px;
  }
}

.creator-modal-actions--spaced {
  margin-top: var(--sys-spacing-large);
}

.pr-header-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  width: 100%;
  min-width: 0;
}

.facts-card {
  margin-top: var(--sys-spacing-large);
}

.facts-card--handoff-hidden {
  visibility: hidden;
}

.primary-stack {
  margin-top: var(--sys-spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.primary-stack:empty {
  display: none;
}

.utility-stack {
  margin-top: var(--sys-spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.utility-action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.utility-action-row:empty {
  display: none;
}

.utility-action-row > :deep(.utility-action-cell:only-child) {
  grid-column: 1 / -1;
}

.notification-subscriptions-region {
  margin-top: var(--sys-spacing-large);
}

@media (max-width: 375px) {
  .header-quick-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .utility-action-row {
    grid-template-columns: 1fr;
  }
}
</style>
