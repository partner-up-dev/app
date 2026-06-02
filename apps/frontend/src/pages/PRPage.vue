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
          <PRStatusBadge :status="prDisplayStatus" />
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
          :initial-status="updateStatusInitialStatus"
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
        :pr-id="id"
        :pr="prDetail"
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

      <PRWaitlistActions
        :pr="prDetail"
        :join-entry-context="joinEntryContext"
      />

      <PRConfirmationAction
        :pr="prDetail"
      />

      <PRCheckInFeedbackActions :pr="prDetail" />

      <PRJoinAction
        :pr="prDetail"
        :event-id="joinEntryContext.routeEventId"
        :entry-surface="joinEntryContext.joinEntrySurface"
        @success-closed="handleJoinSuccessClosed"
      />

      <PRExitAction :pr="prDetail" />

      <div class="utility-stack" data-region="utility">
        <div class="utility-action-row">
          <PRBetaGroupAction :pr="prDetail" />
          <PRMessageThreadAction :pr="prDetail" />
          <PRPairingCodeAction :pr="prDetail" />
          <ButtonPlacement
            v-if="canMountButtonPlacement && placementMatchingContext"
            :matching-context="placementMatchingContext"
            @placement-click="handlePlacementClick"
          />
        </div>

        <PRShareAction
          :pr="prDetail"
          :share-url="shareUrl"
          :spm-route-key="spmRouteKey"
          :pr-share-data="prShareData"
        />

        <PRPageEventPlazaEntry :pr="prDetail" />
      </div>

      <PRNotificationSubscriptionsSection
        class="notification-subscriptions-region"
        :pr="prDetail"
      />
    </template>

    <MiniumCommonFooter data-region="support" />
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, isRef, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import PRBetaGroupAction from "@/domains/pr/ui/sections/PRBetaGroupAction.vue";
import PRCheckInFeedbackActions from "@/domains/pr/ui/sections/PRCheckInFeedbackActions.vue";
import PRConfirmationAction from "@/domains/pr/ui/sections/PRConfirmationAction.vue";
import PRDraftPublishNotice from "@/domains/pr/ui/sections/PRDraftPublishNotice.vue";
import PRExitAction from "@/domains/pr/ui/sections/PRExitAction.vue";
import PRJoinAction from "@/domains/pr/ui/sections/PRJoinAction.vue";
import PRMessageThreadAction from "@/domains/pr/ui/sections/PRMessageThreadAction.vue";
import PRNotificationSubscriptionsSection from "@/domains/pr/ui/sections/PRNotificationSubscriptionsSection.vue";
import PRPageEventPlazaEntry from "@/domains/pr/ui/sections/PRPageEventPlazaEntry.vue";
import PRPairingCodeAction from "@/domains/pr/ui/sections/PRPairingCodeAction.vue";
import PRShareAction from "@/domains/pr/ui/sections/PRShareAction.vue";
import PRWaitlistActions from "@/domains/pr/ui/sections/PRWaitlistActions.vue";
import ButtonPlacement from "@/domains/commerce/ui/ButtonPlacement.vue";
import PRForm from "@/domains/pr/ui/forms/PRForm.vue";
import UpdatePRStatusForm from "@/domains/pr/ui/forms/UpdatePRStatusForm.vue";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { resolvePRDisplayStatus } from "@/domains/pr/model/pr-display-status";
import { usePRDetailHead } from "@/domains/pr/use-cases/usePRDetailHead";
import { usePRRouteShareDescriptor } from "@/domains/pr/use-cases/usePRRouteShareDescriptor";
import { usePRShareContext } from "@/domains/pr/use-cases/usePRShareContext";
import { usePRCreatorActions } from "@/domains/pr/use-cases/usePRCreatorActions";
import type { PRJoinEntryContext } from "@/domains/pr/model/pr-join-entry-context";
import { useRouteShareDescriptorRegistration } from "@/domains/share/use-cases/route-share-controller";
import { usePRRouteId } from "@/domains/pr/routing/usePRRouteId";
import { trackEvent } from "@/shared/telemetry/track";
import {
  providePRPendingReplayRegistry,
  usePRPendingWeChatReplay,
} from "@/domains/pr/use-cases/usePRPendingWeChatReplay";
import { useMatchedPRHandoff } from "@/processes/route-handoff/useMatchedPRHandoff";
import { client } from "@/lib/rpc";
import {
  resolvePlacementOrderingEntry,
  type PlacementInstanceProjection,
} from "@/domains/commerce/queries/useCommerce";
import { ORDERING_ENTRY_STORAGE_KEY } from "@/domains/commerce/model/ordering-entry-storage";

type CreatorSecondaryActionType =
  | "CREATOR_EDIT_CONTENT"
  | "CREATOR_MODIFY_STATUS";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const id = usePRRouteId();
const { data, isLoading, error } = usePRDetail(id);
const prDetail = computed(() => data.value);
const pendingReplayRegistry = providePRPendingReplayRegistry();
const factsCardTargetRef = ref<HTMLElement | null>(null);
const editContentFormRef = ref<InstanceType<typeof PRForm> | null>(null);
const updateStatusFormRef =
  ref<InstanceType<typeof UpdatePRStatusForm> | null>(null);
const showEditContentModal = ref(false);
const showModifyStatusModal = ref(false);
const matchedPRHandoff = useMatchedPRHandoff();
const prReadyForPendingReplay = computed(
  () =>
    id.value !== null && prDetail.value !== undefined && prDetail.value !== null,
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
const updateStatusInitialStatus = computed<PRStatusManual>(() => {
  const status = prDetail.value?.status;
  if (status === "READY" || status === "ACTIVE" || status === "CLOSED") {
    return status;
  }
  return "OPEN";
});
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
const joinEntryContext = computed<PRJoinEntryContext>(() => ({
  routeEventId: routeEventId.value,
  joinEntrySurface: joinEntrySurface.value,
}));
const showEventAssistedCreateHandoffNotice = computed(
  () =>
    (prDetail.value?.partnerSection.viewer.isCreator ?? false) &&
    handoffEntry.value === "event_assisted_create",
);
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

const readJsonOrThrow = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return (await response.json()) as T;
};

const handlePlacementClick = async (
  placement: PlacementInstanceProjection,
): Promise<void> => {
  const pr = prDetail.value;
  const matchingContext = placementMatchingContext.value;
  if (!pr || !matchingContext) return;

  const orderResponse = await client.api.pr[":id"].orders.$get(
    {
      param: { id: String(pr.id) },
      query: {
        offerId: String(placement.offerId),
        statusIn: ["INITIATING", "OPEN"],
      },
    },
    { init: { credentials: "include" } },
  );
  const orderPayload = await readJsonOrThrow<{
    orders: Array<{ id: string }>;
  }>(orderResponse);
  const existingOrder = orderPayload.orders[0];
  if (existingOrder) {
    await router.push({ path: `/orders/${existingOrder.id}` });
    return;
  }

  const orderingEntry = await resolvePlacementOrderingEntry({
    placementInstanceId: placement.id,
    matchingContext,
  });
  sessionStorage.setItem(
    ORDERING_ENTRY_STORAGE_KEY,
    JSON.stringify(orderingEntry),
  );
  await router.push({ path: "/order/new" });
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
