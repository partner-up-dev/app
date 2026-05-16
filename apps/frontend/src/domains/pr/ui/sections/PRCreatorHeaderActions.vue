<template>
  <div v-if="showHeaderQuickActions" class="header-quick-actions">
    <Button
      v-if="showEditContentAction"
      tone="outline"
      size="sm"
      type="button"
      @click="handleOpenCreatorEdit"
    >
      {{ t("prPage.editContent") }}
    </Button>
    <Button
      v-if="showModifyStatusAction"
      tone="outline"
      size="sm"
      type="button"
      @click="handleOpenCreatorModifyStatus"
    >
      {{ t("prPage.modifyStatus") }}
    </Button>

    <EditPRContentModal
      v-if="showEditModal && prId !== null"
      :open="showEditModal"
      :initial-fields="editableFields"
      :pr-id="prId"
      :show-budget-field="showBudgetField"
      :show-time-field="showTimeField"
      @close="showEditModal = false"
      @success="handleEditSuccess"
    />

    <UpdatePRStatusModal
      v-if="prId !== null"
      :open="showModifyModal"
      :pr-id="prId"
      @close="showModifyModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import EditPRContentModal from "@/domains/pr/ui/modals/EditPRContentModal.vue";
import UpdatePRStatusModal from "@/domains/pr/ui/modals/UpdatePRStatusModal.vue";
import type { PRDetailView, PRFormFields } from "@/domains/pr/model/types";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { trackEvent } from "@/shared/telemetry/track";

const props = defineProps<{
  prId: PRId | null;
  pr: PRDetailView;
  supportsEventContextFeatures: boolean;
}>();

const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const showEditModal = ref(false);
const showModifyModal = ref(false);

const editableFields = computed<PRFormFields>(() => ({
  title: props.pr.title,
  type: props.pr.core.type ?? "",
  time: props.pr.core.time ?? [null, null],
  location: props.pr.core.location ?? null,
  route: props.pr.core.route ?? null,
  minPartners: props.pr.core.minPartners ?? null,
  maxPartners: props.pr.core.maxPartners ?? null,
  partners: props.pr.core.partners ?? [],
  budget: props.pr.core.budget ?? null,
  preferences: props.pr.core.preferences ?? [],
  notes: props.pr.core.notes ?? null,
  meetingPoint: props.pr.core.meetingPoint
    ? {
        description: props.pr.core.meetingPoint.description,
        imageUrl: props.pr.core.meetingPoint.imageUrl,
      }
    : null,
}));

const showBudgetField = computed(() => !props.supportsEventContextFeatures);
const showTimeField = computed(() => !props.supportsEventContextFeatures);

const isCreator = computed(() => {
  const createdBy = props.pr.createdBy ?? null;
  if (!createdBy) return false;
  return userSessionStore.userId === createdBy;
});

const showEditContentAction = computed(() => {
  const status = props.pr.status;
  if (status === "DRAFT") return true;
  return Boolean(isCreator.value && status === "OPEN");
});

const showModifyStatusAction = computed(() => Boolean(isCreator.value));
const showHeaderQuickActions = computed(
  () => showEditContentAction.value || showModifyStatusAction.value,
);

useBodyScrollLock(
  computed(() => showEditModal.value || showModifyModal.value),
);

const handleEditSuccess = () => {
  showEditModal.value = false;
};

const handleOpenCreatorEdit = () => {
  if (props.prId !== null && props.supportsEventContextFeatures) {
    trackEvent("pr_secondary_action_click", {
      prId: props.prId,
      actionType: "CREATOR_EDIT_CONTENT",
    });
  }
  showEditModal.value = true;
};

const handleOpenCreatorModifyStatus = () => {
  if (props.prId !== null && props.supportsEventContextFeatures) {
    trackEvent("pr_secondary_action_click", {
      prId: props.prId,
      actionType: "CREATOR_MODIFY_STATUS",
    });
  }
  showModifyModal.value = true;
};
</script>

<style lang="scss" scoped>
.header-quick-actions {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
}

@media (max-width: 375px) {
  .header-quick-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
