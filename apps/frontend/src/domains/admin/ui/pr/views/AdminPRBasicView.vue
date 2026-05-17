<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <PRFilterRail
        v-model:filters="filters"
        show-create-action
        type-options-list-id="admin-pr-type-options"
        location-options-list-id="admin-pr-filter-location-options"
        @create-pr="prepareNewPR"
      />
    </template>

    <template #main>
      <div class="stack">
      <LoadingIndicator
        v-if="workspaceQuery.isLoading.value"
        :message="t('common.loading')"
      />
      <ErrorToast
        v-else-if="workspaceQuery.error.value"
        :message="workspaceQuery.error.value.message"
        persistent
      />

      <template v-else>
        <datalist id="admin-pr-type-options">
          <option
            v-for="typeOption in workspace?.typeOptions ?? []"
            :key="typeOption.type"
            :value="typeOption.type"
          >
            {{ typeOption.eventTitle }}
          </option>
        </datalist>
        <datalist id="admin-pr-filter-location-options">
          <option
            v-for="locationOption in filterLocationOptions"
            :key="locationOption"
            :value="locationOption"
          />
        </datalist>
        <datalist id="admin-pr-form-location-options">
          <option
            v-for="locationOption in formLocationOptions"
            :key="locationOption"
            :value="locationOption"
          />
        </datalist>

        <BentoLayout class="stack--main">
          <BentoItem :title="t('adminPR.prsTitle')" span="full">
            <div class="stack">
              <div class="section-header">
                <p class="hint">
                  {{
                    t("adminPR.filteredCountLabel", {
                      count: filteredPRs.length,
                    })
                  }}
                </p>
              </div>

              <div v-if="filteredPRs.length === 0" class="hint">
                {{ t("adminPR.emptySearchResults") }}
              </div>

              <div
                v-else
                class="selection-list selection-list--grid selection-list--scroll"
              >
                <ChoiceCard
                  v-for="pr in filteredPRs"
                  :key="pr.prId"
                  class="selection-btn"
                  :active="!isCreatingPR && selectedPRId === pr.prId"
                  @click="selectExistingPR(pr.prId)"
                >
                  <span>
                    {{ pr.title || pr.placeDisplayName || `#${pr.prId}` }}
                  </span>
                  <small>#{{ pr.prId }} / {{ pr.status }}</small>
                  <small>{{ formatWindow(pr.time) }}</small>
                </ChoiceCard>
              </div>
            </div>
          </BentoItem>

          <BentoItem
            id="pr-basic"
            :title="t('adminPR.prFormTitle')"
            span="full"
            data-testid="admin-pr.section.basic"
          >
            <div class="stack">
              <label class="field">
                <span class="field-label">{{ t("adminPR.prTitleLabel") }}</span>
                <input v-model="prForm.title" class="field-input" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPR.prTypeLabel") }}</span>
                <input
                  v-model="prForm.type"
                  class="field-input"
                  list="admin-pr-type-options"
                />
              </label>

              <div class="grid-2">
                <label class="field">
                  <span class="field-label">{{ t("adminPR.prTimeStartLabel") }}</span>
                  <input
                    v-model="prForm.startAt"
                    class="field-input"
                    type="datetime-local"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{ t("adminPR.prTimeEndLabel") }}</span>
                  <input
                    v-model="prForm.endAt"
                    class="field-input"
                    type="datetime-local"
                  />
                </label>
              </div>

              <PRPlaceModeField
                v-model="prPlaceValue"
                :label="t('partnerRequestForm.placeMode')"
                :aria-label="t('partnerRequestForm.placeModeAria')"
                :location-label="t('adminPR.prLocationLabel')"
                :location-placeholder="t('partnerRequestForm.locationPlaceholder')"
                location-options-list-id="admin-pr-form-location-options"
                :location-error="locationValidationMessage ?? undefined"
                :route-error="routeValidationMessage ?? undefined"
                test-id-prefix="admin-pr.form.place"
              />

              <label class="field">
                <span class="field-label">
                  {{ t("adminPR.prMeetingPointDescriptionLabel") }}
                </span>
                <textarea
                  v-model="prForm.meetingPointDescription"
                  class="field-input field-textarea"
                ></textarea>
              </label>

              <label class="field">
                <span class="field-label">
                  {{ t("adminPR.prMeetingPointImageUrlLabel") }}
                </span>
                <input
                  v-model="prForm.meetingPointImageUrl"
                  class="field-input"
                />
              </label>

              <div class="grid-2">
                <label class="field">
                  <span class="field-label">{{ t("adminPR.prMinPartnersLabel") }}</span>
                  <input
                    v-model.number="prForm.minPartners"
                    class="field-input"
                    type="number"
                    min="1"
                  />
                </label>
                <label class="field">
                  <span class="field-label">{{ t("adminPR.prMaxPartnersLabel") }}</span>
                  <input
                    v-model.number="prForm.maxPartners"
                    class="field-input"
                    type="number"
                    min="2"
                  />
                </label>
              </div>

              <p v-if="prBoundsValidationMessage" class="error-message">
                {{ prBoundsValidationMessage }}
              </p>
              <p v-if="timeValidationMessage" class="error-message">
                {{ timeValidationMessage }}
              </p>

              <TimelinePolicyPicker
                v-model="prPolicyValue"
                :title="t('adminPR.participationPolicyTitle')"
                :description="t('adminPR.participationPolicyDescription')"
                :event-start-at="resolvedTimeWindow[0]"
                :booking-deadline-at="selectedPR?.effectiveBookingDeadlineAt ?? null"
                :validation-message="policyValidationMessage"
              />

              <label class="field">
                <span class="field-label">{{ t("adminPR.prPreferencesLabel") }}</span>
                <input v-model="prForm.preferencesText" class="field-input" />
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPR.prNotesLabel") }}</span>
                <textarea
                  v-model="prForm.notes"
                  class="field-input field-textarea"
                ></textarea>
              </label>

              <PRJoinGateConfigEditor
                v-model="prForm.joinGateConfig"
                source="PR"
              />

              <label class="field">
                <span class="field-label">{{ t("adminPR.prStatusLabel") }}</span>
                <select v-model="prForm.status" class="field-input">
                  <option value="OPEN">OPEN</option>
                  <option value="READY">READY</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </label>

              <label class="field">
                <span class="field-label">{{ t("adminPR.prVisibilityLabel") }}</span>
                <select v-model="prForm.visibilityStatus" class="field-input">
                  <option value="VISIBLE">
                    {{ t("adminPR.visibilityVisible") }}
                  </option>
                  <option value="HIDDEN">
                    {{ t("adminPR.visibilityHidden") }}
                  </option>
                </select>
              </label>

              <p v-if="matchedTypeOption" class="hint">
                {{
                  t("adminPR.typeDefaultsHint", {
                    title: matchedTypeOption.eventTitle,
                  })
                }}
              </p>

              <div v-if="!isCreatingPR && selectedPR !== null" class="stack stack--tight">
                <label class="field">
                  <span class="field-label">
                    {{ t("adminPR.prFeedbackQuestionnaireInstanceLabel") }}
                  </span>
                  <select
                    class="field-input"
                    :value="prForm.feedbackQuestionnaireInstanceId ?? ''"
                    data-testid="admin-pr.feedback-instance"
                    @change="
                      prForm.feedbackQuestionnaireInstanceId =
                        parseNullableId($event)
                    "
                  >
                    <option value="">{{ t("adminPR.noFeedbackQuestionnaire") }}</option>
                    <option
                      v-for="instance in feedbackQuestionnaireInstances"
                      :key="instance.id"
                      :value="instance.id"
                    >
                      #{{ instance.id }} / {{ instance.title }}
                    </option>
                  </select>
                </label>
                <Button
                  appearance="pill"
                  tone="outline"
                  size="sm"
                  type="button"
                  :disabled="
                    selectedPRId === null ||
                    prFeedbackQuestionnaireUseCase.isPending.updateInstance.value
                  "
                  data-testid="admin-pr.feedback-instance.save"
                  @click="handleSavePRFeedbackQuestionnaireInstance"
                >
                  {{
                    prFeedbackQuestionnaireUseCase.isPending.updateInstance.value
                      ? t("adminPR.saving")
                      : t("adminPR.saveFeedbackQuestionnaireInstanceAction")
                  }}
                </Button>

                <label class="field">
                  <span class="field-label">
                    {{ t("adminPR.prFeedbackQuestionnaireTemplateLabel") }}
                  </span>
                  <select
                    class="field-input"
                    :value="mountFeedbackQuestionnaireTemplateId ?? ''"
                    data-testid="admin-pr.feedback-template"
                    @change="
                      mountFeedbackQuestionnaireTemplateId =
                        parseNullableId($event)
                    "
                  >
                    <option value="">{{ t("adminPR.noFeedbackQuestionnaire") }}</option>
                    <option
                      v-for="template in feedbackQuestionnaireTemplates"
                      :key="template.id"
                      :value="template.id"
                    >
                      {{ template.key }}@{{ template.version }} / {{ template.title }}
                    </option>
                  </select>
                </label>
                <Button
                  appearance="pill"
                  tone="outline"
                  size="sm"
                  type="button"
                  :disabled="
                    selectedPRId === null ||
                    mountFeedbackQuestionnaireTemplateId === null ||
                    prFeedbackQuestionnaireUseCase.isPending.materialize.value
                  "
                  data-testid="admin-pr.feedback-template.mount"
                  @click="handleMaterializePRFeedbackQuestionnaireInstance"
                >
                  {{
                    prFeedbackQuestionnaireUseCase.isPending.materialize.value
                      ? t("adminPR.saving")
                      : t("adminPR.mountFeedbackQuestionnaireTemplateAction")
                  }}
                </Button>
              </div>

              <div class="actions actions--inline">
                <Button
                  appearance="pill"
                  size="sm"
                  type="button"
                  :disabled="
                    isSavingPR ||
                    isDeletingPR ||
                    Boolean(prBoundsValidationMessage) ||
                    Boolean(timeValidationMessage) ||
                    Boolean(policyValidationMessage) ||
                    Boolean(prPlaceValidationMessage) ||
                    prForm.type.trim().length === 0
                  "
                  @click="handleSavePR"
                >
                  {{
                    isSavingPR
                      ? t("adminPR.saving")
                      : isCreatingPR
                        ? t("adminPR.createPRAction")
                        : t("adminPR.savePRAction")
                  }}
                </Button>
                <Button
                  v-if="!isCreatingPR && selectedPR !== null"
                  appearance="pill"
                  tone="danger"
                  size="sm"
                  type="button"
                  :disabled="isSavingPR || isDeletingPR"
                  @click="requestDeletePR(selectedPR.prId)"
                >
                  {{
                    isDeletingPR
                      ? t("adminPR.deletingPR")
                      : t("adminPR.deletePRAction")
                  }}
                </Button>
              </div>
            </div>
          </BentoItem>
        </BentoLayout>

        <ErrorToast
          v-if="mutationErrorMessage"
          :message="mutationErrorMessage"
          @close="resetMutationErrors"
        />
      </template>
      </div>

      <ConfirmDialog
        :open="pendingDeletePRId !== null"
        :title="t('adminPR.deleteConfirmTitle')"
        :message="
          t('adminPR.deleteConfirmMessage', {
            title: pendingDeletePRLabel,
          })
        "
        :description="t('adminPR.deleteConfirmDescription')"
        :confirm-label="
          isDeletingPR ? t('adminPR.deletingPR') : t('adminPR.deletePRAction')
        "
        confirm-tone="danger"
        :loading="isDeletingPR"
        :disabled="pendingDeletePRId === null"
        @close="closeDeletePRConfirm"
        @confirm="confirmDeletePR"
      />
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import PRFilterRail from "@/domains/admin/ui/pr/components/PRFilterRail.vue";
import {
  type AdminPRRecord,
  useAdminPRWorkspaceSelection,
} from "@/domains/admin/use-cases/pr/useAdminPRWorkspaceSelection";
import { toIsoDateTime } from "@/domains/admin/use-cases/pr/prMutationInput";
import { useAdminPRFeedbackQuestionnaire } from "@/domains/admin/use-cases/pr/useAdminPRFeedbackQuestionnaire";
import { useSaveAdminPRBasic } from "@/domains/admin/use-cases/pr/useSaveAdminPRBasic";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  useDeleteAdminPR,
} from "@/domains/admin/queries/useAdminPRManagement";
import { validateManualPartnerBounds } from "@/lib/validation";
import {
  clonePRRoute,
  getPRRouteValidationIssue,
  type PRPlaceMode,
} from "@/domains/pr/model/pr-route";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import TimelinePolicyPicker from "@/shared/ui/forms/TimelinePolicyPicker.vue";
import ConfirmDialog from "@/shared/ui/overlay/ConfirmDialog.vue";
import PRJoinGateConfigEditor from "@/domains/pr/ui/forms/PRJoinGateConfigEditor.vue";
import PRPlaceModeField, {
  type PRPlaceModeFieldValue,
} from "@/domains/pr/ui/forms/PRPlaceModeField.vue";
import type { PRJoinGateConfig, PRRoute } from "@partner-up-dev/backend";

type PRForm = {
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  location: string;
  route: PRRoute | null;
  minPartners: number | null;
  maxPartners: number | null;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
  preferencesText: string;
  notes: string;
  meetingPointDescription: string;
  meetingPointImageUrl: string;
  joinGateConfig: PRJoinGateConfig;
  confirmationEnabled: boolean;
  feedbackQuestionnaireInstanceId: number | null;
  status: "OPEN" | "READY" | "ACTIVE" | "CLOSED";
  visibilityStatus: "VISIBLE" | "HIDDEN";
};

const DEFAULT_CONFIRMATION_START_OFFSET_MINUTES = 120;
const DEFAULT_CONFIRMATION_END_OFFSET_MINUTES = 30;
const DEFAULT_JOIN_LOCK_OFFSET_MINUTES = 30;

const emptyPRForm = (): PRForm => ({
  title: "",
  type: "",
  startAt: "",
  endAt: "",
  location: "",
  route: null,
  minPartners: null,
  maxPartners: null,
  confirmationStartOffsetMinutes: DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  confirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  joinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  preferencesText: "",
  notes: "",
  meetingPointDescription: "",
  meetingPointImageUrl: "",
  joinGateConfig: [],
  confirmationEnabled: true,
  feedbackQuestionnaireInstanceId: null,
  status: "OPEN",
  visibilityStatus: "VISIBLE",
});

const toLocalDateTimeInput = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toPRForm = (pr: AdminPRRecord): PRForm => ({
  title: pr.title ?? "",
  type: pr.type,
  startAt: toLocalDateTimeInput(pr.time[0]),
  endAt: toLocalDateTimeInput(pr.time[1]),
  location: pr.location ?? "",
  route: clonePRRoute(pr.route),
  minPartners: pr.minPartners,
  maxPartners: pr.maxPartners,
  confirmationStartOffsetMinutes: pr.confirmationStartOffsetMinutes,
  confirmationEndOffsetMinutes: pr.confirmationEndOffsetMinutes,
  joinLockOffsetMinutes: pr.joinLockOffsetMinutes,
  preferencesText: pr.preferences.join(", "),
  notes: pr.notes ?? "",
  meetingPointDescription: pr.meetingPoint?.description ?? "",
  meetingPointImageUrl: pr.meetingPoint?.imageUrl ?? "",
  joinGateConfig: pr.joinGateConfig,
  confirmationEnabled: pr.confirmationEnabled,
  feedbackQuestionnaireInstanceId: pr.feedbackQuestionnaireInstanceId ?? null,
  status: pr.status as PRForm["status"],
  visibilityStatus: pr.visibilityStatus as PRForm["visibilityStatus"],
});

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const isCreatingPR = ref(false);
const prWorkspace = useAdminPRWorkspaceSelection({
  enabled: isAdmin,
  skipAutoSelect: isCreatingPR,
});
const {
  workspaceQuery,
  filters,
  workspace,
  prs,
  typeOptions,
  filterLocationOptions,
  poiOptions,
  selectedPRIdRaw,
  selectedPRId,
  selectedPR,
  filteredPRs,
  selectPR,
  clearSelection,
  formatWindow,
} = prWorkspace;
const savePRBasicUseCase = useSaveAdminPRBasic();
const deletePRMutation = useDeleteAdminPR();
const prFeedbackQuestionnaireUseCase = useAdminPRFeedbackQuestionnaire();

const prForm = ref<PRForm>(emptyPRForm());
const mountFeedbackQuestionnaireTemplateId = ref<number | null>(null);
const lastAppliedType = ref<string | null>(null);
const pendingDeletePRId = ref<number | null>(null);

const feedbackQuestionnaireInstances = computed(
  () => workspace.value?.feedbackQuestionnaireInstances ?? [],
);
const feedbackQuestionnaireTemplates = computed(
  () => workspace.value?.feedbackQuestionnaireTemplates ?? [],
);
const pendingDeletePR = computed<AdminPRRecord | null>(
  () =>
    prs.value.find((pr) => pr.prId === pendingDeletePRId.value) ?? null,
);
const pendingDeletePRLabel = computed(() => {
  const pr = pendingDeletePR.value;
  if (pr) {
    return pr.title || pr.placeDisplayName || `#${pr.prId}`;
  }
  return pendingDeletePRId.value === null ? "" : `#${pendingDeletePRId.value}`;
});

const prPlaceMode = computed<PRPlaceMode>(() =>
  prForm.value.route ? "route" : "location",
);

const prPlaceValue = computed<PRPlaceModeFieldValue>({
  get: () => ({
    location: prForm.value.location.trim() || null,
    route: prForm.value.route,
  }),
  set: (value) => {
    prForm.value = {
      ...prForm.value,
      location: value.location ?? "",
      route: clonePRRoute(value.route),
    };
  },
});

const locationValidationMessage = computed(() => {
  if (prPlaceMode.value !== "location") {
    return null;
  }
  return prForm.value.location.trim().length === 0
    ? t("adminPR.prLocationRequiredValidation")
    : null;
});

const routeValidationMessage = computed(() => {
  if (prPlaceMode.value !== "route") {
    return null;
  }

  const issue = getPRRouteValidationIssue(prForm.value.route);
  if (issue === "min-points") {
    return t("validation.routeMinPoints");
  }
  if (issue === "name-required") {
    return t("validation.routePointNameRequired");
  }
  if (issue === "coordinate-required") {
    return t("validation.routePointCoordinateRequired");
  }
  return null;
});

const prPlaceValidationMessage = computed(
  () => locationValidationMessage.value ?? routeValidationMessage.value,
);

const matchedTypeOption = computed(
  () =>
    typeOptions.value.find(
      (option) => option.type.trim() === prForm.value.type.trim(),
    ) ?? null,
);

const formLocationOptions = computed(() => {
  const matchedLocations = matchedTypeOption.value?.locationOptions ?? [];
  if (matchedLocations.length > 0) {
    return matchedLocations;
  }
  return poiOptions.value;
});

const resolvedTimeWindow = computed<[string | null, string | null]>(() => [
  toIsoDateTime(prForm.value.startAt),
  toIsoDateTime(prForm.value.endAt),
]);

const prBoundsValidationMessage = computed(() =>
  validateManualPartnerBounds(
    prForm.value.minPartners,
    prForm.value.maxPartners,
  ),
);

const timeValidationMessage = computed(() => {
  const [startAt, endAt] = resolvedTimeWindow.value;
  if (!startAt || !endAt) {
    return t("adminPR.timeWindowRequired");
  }
  if (new Date(startAt).getTime() > new Date(endAt).getTime()) {
    return t("adminPR.timeWindowValidationStartBeforeEnd");
  }
  return null;
});

const prPolicyValue = computed({
  get: () => ({
    confirmationEnabled: prForm.value.confirmationEnabled,
    confirmationStartOffsetMinutes:
      prForm.value.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: prForm.value.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: prForm.value.joinLockOffsetMinutes,
  }),
  set: (value) => {
    prForm.value = {
      ...prForm.value,
      confirmationEnabled: value.confirmationEnabled,
      confirmationStartOffsetMinutes: value.confirmationStartOffsetMinutes,
      confirmationEndOffsetMinutes: value.confirmationEndOffsetMinutes,
      joinLockOffsetMinutes: value.joinLockOffsetMinutes,
    };
  },
});

const policyValidationMessage = computed(() => {
  if (!prForm.value.confirmationEnabled) {
    return null;
  }
  if (
    prForm.value.confirmationStartOffsetMinutes <=
    prForm.value.confirmationEndOffsetMinutes
  ) {
    return t("adminPR.policyValidationStartBeforeEnd");
  }

  if (
    prForm.value.joinLockOffsetMinutes <
    prForm.value.confirmationEndOffsetMinutes
  ) {
    return t("adminPR.policyValidationJoinLockAfterConfirmationEnd");
  }

  return null;
});

const isSavingPR = computed(
  () =>
    savePRBasicUseCase.isPending.create.value ||
    savePRBasicUseCase.isPending.updateContent.value ||
    savePRBasicUseCase.isPending.updateStatus.value ||
    savePRBasicUseCase.isPending.updateVisibility.value ||
    prFeedbackQuestionnaireUseCase.isPending.updateInstance.value ||
    prFeedbackQuestionnaireUseCase.isPending.materialize.value,
);
const isDeletingPR = computed(() => deletePRMutation.isPending.value);

const mutationErrorMessage = computed(
  () =>
    savePRBasicUseCase.errors.create.value?.message ||
    deletePRMutation.error.value?.message ||
    savePRBasicUseCase.errors.updateContent.value?.message ||
    savePRBasicUseCase.errors.updateStatus.value?.message ||
    savePRBasicUseCase.errors.updateVisibility.value?.message ||
    prFeedbackQuestionnaireUseCase.errors.updateInstance.value?.message ||
    prFeedbackQuestionnaireUseCase.errors.materialize.value?.message ||
    null,
);

watch(
  [selectedPR, isCreatingPR],
  ([pr, creating]) => {
    if (creating || !pr) {
      prForm.value = emptyPRForm();
      mountFeedbackQuestionnaireTemplateId.value = null;
      lastAppliedType.value = null;
      return;
    }
    prForm.value = toPRForm(pr);
    mountFeedbackQuestionnaireTemplateId.value =
      typeOptions.value.find((option) => option.type === pr.type)
        ?.feedbackQuestionnaireTemplateId ?? null;
    lastAppliedType.value = null;
  },
  { immediate: true },
);

watch(
  [() => prForm.value.type, isCreatingPR],
  ([type, creating]) => {
    if (!creating) return;
    const matched = typeOptions.value.find(
      (option) => option.type === type.trim(),
    );
    if (!matched || lastAppliedType.value === matched.type) {
      return;
    }
    prForm.value = {
      ...prForm.value,
      minPartners: matched.defaultMinPartners,
      maxPartners: matched.defaultMaxPartners,
      confirmationStartOffsetMinutes:
        matched.defaultConfirmationStartOffsetMinutes,
      confirmationEnabled: matched.defaultConfirmationEnabled,
      confirmationEndOffsetMinutes: matched.defaultConfirmationEndOffsetMinutes,
      joinLockOffsetMinutes: matched.defaultJoinLockOffsetMinutes,
      joinGateConfig: matched.joinGateConfig,
    };
    lastAppliedType.value = matched.type;
  },
);

const parseNullableId = (event: Event): number | null => {
  const target = event.target as HTMLSelectElement | null;
  const parsed = Number(target?.value ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const prepareNewPR = () => {
  isCreatingPR.value = true;
  clearSelection();
  prForm.value = emptyPRForm();
  mountFeedbackQuestionnaireTemplateId.value = null;
  lastAppliedType.value = null;
};

const selectExistingPR = (prId: number) => {
  isCreatingPR.value = false;
  selectPR(prId);
};

const resetMutationErrors = () => {
  savePRBasicUseCase.reset();
  deletePRMutation.reset();
  prFeedbackQuestionnaireUseCase.reset();
};

const requestDeletePR = (prId: number) => {
  deletePRMutation.reset();
  pendingDeletePRId.value = prId;
};

const closeDeletePRConfirm = () => {
  if (deletePRMutation.isPending.value) return;
  pendingDeletePRId.value = null;
};

const clearSelectedPRAfterDelete = (deletedPrId: number) => {
  if (selectedPRId.value === deletedPrId) {
    clearSelection();
    isCreatingPR.value = false;
  }
};

const confirmDeletePR = async () => {
  const prId = pendingDeletePRId.value;
  if (prId === null) return;

  try {
    await deletePRMutation.mutateAsync({ prId });
    clearSelectedPRAfterDelete(prId);
    pendingDeletePRId.value = null;
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleSavePRFeedbackQuestionnaireInstance = async () => {
  if (selectedPRId.value === null) return;

  try {
    await prFeedbackQuestionnaireUseCase.updateInstance({
      prId: selectedPRId.value,
      feedbackQuestionnaireInstanceId:
        prForm.value.feedbackQuestionnaireInstanceId,
    });
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleMaterializePRFeedbackQuestionnaireInstance = async () => {
  if (
    selectedPRId.value === null ||
    mountFeedbackQuestionnaireTemplateId.value === null
  ) {
    return;
  }

  try {
    const result =
      await prFeedbackQuestionnaireUseCase.materializeFromTemplate({
        prId: selectedPRId.value,
        feedbackQuestionnaireTemplateId:
          mountFeedbackQuestionnaireTemplateId.value,
      });
    if (!result) return;
    prForm.value = {
      ...prForm.value,
      feedbackQuestionnaireInstanceId:
        result.feedbackQuestionnaireInstanceId ?? null,
    };
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleSavePR = async () => {
  if (
    prBoundsValidationMessage.value ||
    timeValidationMessage.value ||
    prPlaceValidationMessage.value ||
    policyValidationMessage.value
  ) {
    return;
  }

  try {
    if (isCreatingPR.value || selectedPRId.value === null) {
      const result = await savePRBasicUseCase.createPR(prForm.value);
      if (result === null) {
        return;
      }
      isCreatingPR.value = false;
      selectedPRIdRaw.value = String(result.root.id);
      return;
    }

    if (selectedPR.value) {
      await savePRBasicUseCase.updatePR({
        current: {
          prId: selectedPRId.value,
          status: selectedPR.value.status as PRForm["status"],
          visibilityStatus:
            selectedPR.value.visibilityStatus as PRForm["visibilityStatus"],
        },
        draft: prForm.value,
      });
    }
  } catch {
    // Mutation state already drives page-level feedback.
  }
};
</script>

<style lang="scss" scoped>
.stack,
.selection-list {
  display: flex;
  flex-direction: column;
}

.stack,
.selection-list {
  gap: var(--sys-spacing-medium);
}

.stack--main {
  width: 100%;
}

.hint {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.error-message {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-error);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.selection-list--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-spacing-small);
}

.selection-list--scroll {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--sys-spacing-xsmall);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field-label {
  @include mx.pu-font(label-medium);
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

.field-textarea {
  min-height: 96px;
  resize: vertical;
}

.stack--tight {
  gap: var(--sys-spacing-xsmall);
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.actions--inline {
  gap: var(--sys-spacing-xsmall);
  flex-wrap: wrap;
}

.grid-2 {
  display: grid;
  gap: var(--sys-spacing-medium);
}

@media (min-width: 880px) {
  .grid-2 {
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  }
}
</style>
