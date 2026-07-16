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
        <PuLoadingState
          v-if="workspaceQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <PuInlineNotice tone="error"
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
        />

        <template v-else>
          <datalist id="admin-pr-type-options">
            <option
              v-for="typeOption in workspace?.typeOptions ?? []"
              :key="typeOption.type"
              :value="typeOption.type"
            >
              {{ typeOption.title }}
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

          <BentoLayout class="pr-workspace-layout">
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
                  class="pr-result-list pr-result-list--grid pr-result-list--scroll"
                >
                  <PuCard
                    v-for="pr in filteredPRs"
                    :key="pr.prId"
                    class="pr-result-card"
                    :active="!isCreatingPR && selectedPRId === pr.prId"
                    @click="selectExistingPR(pr.prId)"
                    selectable
                    variant="outline"
                    padding="sm"
                    gap="xs"
                  >
                    <span>
                      {{ pr.title || pr.placeDisplayName || `#${pr.prId}` }}
                    </span>
                    <small>#{{ pr.prId }} / {{ pr.status }}</small>
                    <small>{{ formatWindow(pr.time) }}</small>
                  </PuCard>
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
                  <span class="field-label">{{
                    t("adminPR.prTitleLabel")
                  }}</span>
                  <input v-model="prForm.title" class="field-input" />
                </label>

                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.prTypeLabel")
                  }}</span>
                  <input
                    v-model="prForm.type"
                    class="field-input"
                    list="admin-pr-type-options"
                  />
                </label>

                <div class="grid-2">
                  <PuFormItem
                    :label="t('adminPR.prTimeStartLabel')"
                    for-id="admin-pr-start-at"
                  >
                    <PuInput
                      id="admin-pr-start-at"
                      v-model="prForm.startAt"
                      native-type="datetime-local"
                    />
                  </PuFormItem>
                  <PuFormItem
                    :label="t('adminPR.prTimeEndLabel')"
                    for-id="admin-pr-end-at"
                  >
                    <PuInput
                      id="admin-pr-end-at"
                      v-model="prForm.endAt"
                      native-type="datetime-local"
                    />
                  </PuFormItem>
                </div>

                <PRPlaceModeField
                  v-model="prPlaceValue"
                  :label="t('partnerRequestForm.placeMode')"
                  :aria-label="t('partnerRequestForm.placeModeAria')"
                  :location-label="t('adminPR.prLocationLabel')"
                  :location-placeholder="
                    t('partnerRequestForm.locationPlaceholder')
                  "
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

                <PuFormItem
                  :label="t('adminPR.prMeetingPointImageUrlLabel')"
                  for-id="admin-pr-meeting-point-image-url"
                >
                  <PuFileUpload
                    id="admin-pr-meeting-point-image-url"
                    v-model="prMeetingPointImageUploadValue"
                    mode="url"
                    layout="inline"
                    :url-placeholder="t('adminPR.prMeetingPointImageUrlPlaceholder')"
                    :url-add-label="t('adminPois.addUrlAction')"
                    @add="handlePRMeetingPointImageAdd"
                    @remove="handlePRMeetingPointImageRemove"
                    @reject="handlePRMeetingPointImageReject"
                    @update:model-value="handlePRMeetingPointImageUpdate"
                  />
                  <PuInlineNotice
                    v-if="prMeetingPointImageError"
                    tone="error"
                    :message="prMeetingPointImageError"
                  />
                </PuFormItem>

                <div class="grid-2">
                  <label class="field">
                    <span class="field-label">{{
                      t("adminPR.prMinPartnersLabel")
                    }}</span>
                    <input
                      v-model.number="prForm.minPartners"
                      class="field-input"
                      type="number"
                      min="1"
                    />
                  </label>
                  <label class="field">
                    <span class="field-label">{{
                      t("adminPR.prMaxPartnersLabel")
                    }}</span>
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
                  :start-at="resolvedTimeWindow[0]"
                  :validation-message="policyValidationMessage"
                />

                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.prPreferencesLabel")
                  }}</span>
                  <input v-model="prForm.preferencesText" class="field-input" />
                </label>

                <label class="field">
                  <span class="field-label">{{
                    t("adminPR.prNotesLabel")
                  }}</span>
                  <textarea
                    v-model="prForm.notes"
                    class="field-input field-textarea"
                  ></textarea>
                </label>

                <PRJoinGateConfigEditor
                  v-model="prForm.joinGateConfig"
                  source="PR"
                />

                <PuFormItem
                  :label="t('adminPR.prStatusLabel')"
                  for-id="admin-pr-status"
                >
                  <PuSelect
                    id="admin-pr-status"
                    v-model="prStatusModel"
                    :options="prStatusOptions"
                  />
                </PuFormItem>

                <PuFormItem
                  :label="t('adminPR.prVisibilityLabel')"
                  for-id="admin-pr-visibility"
                >
                  <PuSelect
                    id="admin-pr-visibility"
                    v-model="prVisibilityStatusModel"
                    :options="prVisibilityStatusOptions"
                  />
                </PuFormItem>

                <p v-if="matchedTypeOption" class="hint">
                  {{
                    t("adminPR.typeDefaultsHint", {
                      title: matchedTypeOption.title,
                    })
                  }}
                </p>

                <div
                  v-if="!isCreatingPR && selectedPR !== null"
                  class="stack stack--tight"
                >
                  <PuFormItem
                    :label="t('adminPR.prFeedbackQuestionnaireInstanceLabel')"
                    for-id="admin-pr-feedback-instance"
                  >
                    <PuSelect
                      id="admin-pr-feedback-instance"
                      v-model="feedbackQuestionnaireInstanceModel"
                      :options="feedbackQuestionnaireInstanceOptions"
                      :placeholder="t('adminPR.noFeedbackQuestionnaire')"
                      clearable
                      data-testid="admin-pr.feedback-instance"
                    />
                  </PuFormItem>
                  <PuButton
                    shape="pill"
                    tone="neutral" variant="outline"
                    size="sm"

                    :disabled="
                      selectedPRId === null ||
                      prFeedbackQuestionnaireUseCase.isPending.updateInstance
                        .value
                    "
                    data-testid="admin-pr.feedback-instance.save"
                    @click="handleSavePRFeedbackQuestionnaireInstance"
                  >
                    {{
                      prFeedbackQuestionnaireUseCase.isPending.updateInstance
                        .value
                        ? t("adminPR.saving")
                        : t("adminPR.saveFeedbackQuestionnaireInstanceAction")
                    }}
                  </PuButton>

                  <PuFormItem
                    :label="t('adminPR.prFeedbackQuestionnaireTemplateLabel')"
                    for-id="admin-pr-feedback-template"
                  >
                    <PuSelect
                      id="admin-pr-feedback-template"
                      v-model="mountFeedbackQuestionnaireTemplateModel"
                      :options="feedbackQuestionnaireTemplateOptions"
                      :placeholder="t('adminPR.noFeedbackQuestionnaire')"
                      clearable
                      data-testid="admin-pr.feedback-template"
                    />
                  </PuFormItem>
                  <PuButton
                    shape="pill"
                    tone="neutral" variant="outline"
                    size="sm"

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
                  </PuButton>
                </div>

                <div class="actions actions--inline">
                  <PuButton
                    shape="pill"
                    size="sm"

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
                  </PuButton>
                  <PuButton
                    v-if="!isCreatingPR && selectedPR !== null"
                    shape="pill"
                    tone="danger" variant="outline"
                    size="sm"

                    :disabled="isSavingPR || isDeletingPR"
                    @click="requestDeletePR(selectedPR.prId)"
                  >
                    {{
                      isDeletingPR
                        ? t("adminPR.deletingPR")
                        : t("adminPR.deletePRAction")
                    }}
                  </PuButton>
                </div>
              </div>
            </BentoItem>
          </BentoLayout>

          <PuInlineNotice tone="error" dismissible
            v-if="mutationErrorMessage"
            :message="mutationErrorMessage"
            @close="resetMutationErrors"
          />
        </template>
      </div>

      <PuDialog
        :open="pendingDeletePRId !== null"
        :title="t('adminPR.deleteConfirmTitle')"
        :description="t('adminPR.deleteConfirmDescription')"
        :confirm-text="
          isDeletingPR ? t('adminPR.deletingPR') : t('adminPR.deletePRAction')
        "
        tone="error"
        :confirm-loading="isDeletingPR"
        :confirm-disabled="pendingDeletePRId === null"
        @close="closeDeletePRConfirm"
        @cancel="closeDeletePRConfirm"
        @confirm="confirmDeletePR"
      >
        <p class="dialog-message">
          {{
            t("adminPR.deleteConfirmMessage", {
              title: pendingDeletePRLabel,
            })
          }}
        </p>
      </PuDialog>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import type { PRJoinGateConfig, PRRoute } from "@partner-up-dev/backend";
import {
  PuButton,
  PuCard,
  PuDialog,
  PuFileUpload,
  type PuFileUploadItem,
  type PuFileUploadRejection,
  type PuFileUploadValue,
  PuFormItem,
  PuInlineNotice,
  PuInput,
  PuLoadingState,
  PuSelect,
  type PuSelectOption,
  type PuSelectValue,
} from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDeleteAdminPR } from "@/domains/admin/queries/useAdminPRManagement";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import BentoLayout from "@/domains/admin/ui/layout/BentoLayout.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import PRFilterRail from "@/domains/admin/ui/pr/components/PRFilterRail.vue";
import { toIsoDateTime } from "@/domains/admin/use-cases/pr/prMutationInput";
import { useAdminPRFeedbackQuestionnaire } from "@/domains/admin/use-cases/pr/useAdminPRFeedbackQuestionnaire";
import {
  type AdminPRRecord,
  useAdminPRWorkspaceSelection,
} from "@/domains/admin/use-cases/pr/useAdminPRWorkspaceSelection";
import { useSaveAdminPRBasic } from "@/domains/admin/use-cases/pr/useSaveAdminPRBasic";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  clonePRRoute,
  getPRRouteValidationIssue,
  type PRPlaceMode,
} from "@/domains/pr/model/pr-route";
import PRJoinGateConfigEditor from "@/domains/pr/ui/forms/PRJoinGateConfigEditor.vue";
import PRPlaceModeField, {
  type PRPlaceModeFieldValue,
} from "@/domains/pr/ui/forms/PRPlaceModeField.vue";
import { validateManualPartnerBounds } from "@/lib/validation";
import TimelinePolicyPicker from "@/shared/ui/forms/TimelinePolicyPicker.vue";
import { imageUploadItemFromUrl } from "@/shared/upload/useDesignWebImageUpload";

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
const prMeetingPointImageError = ref<string | null>(null);

const feedbackQuestionnaireInstances = computed(
  () => workspace.value?.feedbackQuestionnaireInstances ?? [],
);
const feedbackQuestionnaireTemplates = computed(
  () => workspace.value?.feedbackQuestionnaireTemplates ?? [],
);
const prStatusOptions = computed<PuSelectOption[]>(() => [
  { label: "OPEN", value: "OPEN" },
  { label: "READY", value: "READY" },
  { label: "ACTIVE", value: "ACTIVE" },
  { label: "CLOSED", value: "CLOSED" },
]);
const prVisibilityStatusOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminPR.visibilityVisible"), value: "VISIBLE" },
  { label: t("adminPR.visibilityHidden"), value: "HIDDEN" },
]);
const feedbackQuestionnaireInstanceOptions = computed<PuSelectOption[]>(() =>
  feedbackQuestionnaireInstances.value.map((instance) => ({
    label: `#${instance.id} / ${instance.title}`,
    value: instance.id,
  })),
);
const feedbackQuestionnaireTemplateOptions = computed<PuSelectOption[]>(() =>
  feedbackQuestionnaireTemplates.value.map((template) => ({
    label: `${template.key}@${template.version} / ${template.title}`,
    value: template.id,
  })),
);
const pendingDeletePR = computed<AdminPRRecord | null>(
  () => prs.value.find((pr) => pr.prId === pendingDeletePRId.value) ?? null,
);
const pendingDeletePRLabel = computed(() => {
  const pr = pendingDeletePR.value;
  if (pr) {
    return pr.title || pr.placeDisplayName || `#${pr.prId}`;
  }
  return pendingDeletePRId.value === null ? "" : `#${pendingDeletePRId.value}`;
});

const prPlaceMode = computed<PRPlaceMode>(() => (prForm.value.route ? "route" : "location"));

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
  () => typeOptions.value.find((option) => option.type.trim() === prForm.value.type.trim()) ?? null,
);

const formLocationOptions = computed(() => {
  const matchedLocations = matchedTypeOption.value?.locationOptions ?? [];
  if (matchedLocations.length > 0) {
    return matchedLocations;
  }
  return poiOptions.value;
});

const isPRStatus = (value: PuSelectValue): value is PRForm["status"] =>
  value === "OPEN" || value === "READY" || value === "ACTIVE" || value === "CLOSED";

const isPRVisibilityStatus = (value: PuSelectValue): value is PRForm["visibilityStatus"] =>
  value === "VISIBLE" || value === "HIDDEN";

const nullablePositiveIntegerFromSelectValue = (value: PuSelectValue): number | null => {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const prStatusModel = computed({
  get: () => prForm.value.status,
  set: (value: PuSelectValue) => {
    if (isPRStatus(value)) {
      prForm.value.status = value;
    }
  },
});

const prVisibilityStatusModel = computed({
  get: () => prForm.value.visibilityStatus,
  set: (value: PuSelectValue) => {
    if (isPRVisibilityStatus(value)) {
      prForm.value.visibilityStatus = value;
    }
  },
});

const feedbackQuestionnaireInstanceModel = computed({
  get: () => prForm.value.feedbackQuestionnaireInstanceId,
  set: (value: PuSelectValue) => {
    prForm.value.feedbackQuestionnaireInstanceId = nullablePositiveIntegerFromSelectValue(value);
  },
});

const mountFeedbackQuestionnaireTemplateModel = computed({
  get: () => mountFeedbackQuestionnaireTemplateId.value,
  set: (value: PuSelectValue) => {
    mountFeedbackQuestionnaireTemplateId.value = nullablePositiveIntegerFromSelectValue(value);
  },
});

const prMeetingPointImageUploadValue = computed<PuFileUploadValue>({
  get: () => {
    const imageUrl = prForm.value.meetingPointImageUrl.trim();
    return imageUrl ? imageUploadItemFromUrl(imageUrl) : null;
  },
  set: (value) => {
    prForm.value.meetingPointImageUrl = value?.source === "url" && value.url ? value.url : "";
  },
});

const resolvedTimeWindow = computed<[string | null, string | null]>(() => [
  toIsoDateTime(prForm.value.startAt),
  toIsoDateTime(prForm.value.endAt),
]);

const prBoundsValidationMessage = computed(() =>
  validateManualPartnerBounds(prForm.value.minPartners, prForm.value.maxPartners),
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
    confirmationStartOffsetMinutes: prForm.value.confirmationStartOffsetMinutes,
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
  if (prForm.value.confirmationStartOffsetMinutes <= prForm.value.confirmationEndOffsetMinutes) {
    return t("adminPR.policyValidationStartBeforeEnd");
  }

  if (prForm.value.joinLockOffsetMinutes < prForm.value.confirmationEndOffsetMinutes) {
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

watch([() => prForm.value.type, isCreatingPR], ([type, creating]) => {
  if (!creating) return;
  const matched = typeOptions.value.find((option) => option.type === type.trim());
  if (!matched || lastAppliedType.value === matched.type) {
    return;
  }
  prForm.value = {
    ...prForm.value,
    minPartners: matched.defaultMinPartners,
    maxPartners: matched.defaultMaxPartners,
    confirmationStartOffsetMinutes: matched.defaultConfirmationStartOffsetMinutes,
    confirmationEnabled: matched.defaultConfirmationEnabled,
    confirmationEndOffsetMinutes: matched.defaultConfirmationEndOffsetMinutes,
    joinLockOffsetMinutes: matched.defaultJoinLockOffsetMinutes,
    joinGateConfig: matched.joinGateConfig,
  };
  lastAppliedType.value = matched.type;
});

const prepareNewPR = () => {
  isCreatingPR.value = true;
  clearSelection();
  prForm.value = emptyPRForm();
  mountFeedbackQuestionnaireTemplateId.value = null;
  lastAppliedType.value = null;
};

const handlePRMeetingPointImageUpdate = (value: PuFileUploadValue): void => {
  prMeetingPointImageUploadValue.value = value;
  prMeetingPointImageError.value = null;
};

const handlePRMeetingPointImageAdd = (item: PuFileUploadItem): void => {
  if (item.source === "url" && item.url) {
    prForm.value.meetingPointImageUrl = item.url;
    prMeetingPointImageError.value = null;
  }
};

const handlePRMeetingPointImageRemove = (): void => {
  prForm.value.meetingPointImageUrl = "";
  prMeetingPointImageError.value = null;
};

const handlePRMeetingPointImageReject = (rejections: PuFileUploadRejection[]): void => {
  prMeetingPointImageError.value = rejections[0]?.message ?? null;
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
      feedbackQuestionnaireInstanceId: prForm.value.feedbackQuestionnaireInstanceId,
    });
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleMaterializePRFeedbackQuestionnaireInstance = async () => {
  if (selectedPRId.value === null || mountFeedbackQuestionnaireTemplateId.value === null) {
    return;
  }

  try {
    const result = await prFeedbackQuestionnaireUseCase.materializeFromTemplate({
      prId: selectedPRId.value,
      feedbackQuestionnaireTemplateId: mountFeedbackQuestionnaireTemplateId.value,
    });
    if (!result) return;
    prForm.value = {
      ...prForm.value,
      feedbackQuestionnaireInstanceId: result.feedbackQuestionnaireInstanceId ?? null,
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
      selectedPRIdRaw.value = String(result.id);
      return;
    }

    if (selectedPR.value) {
      await savePRBasicUseCase.updatePR({
        current: {
          prId: selectedPRId.value,
          status: selectedPR.value.status as PRForm["status"],
          visibilityStatus: selectedPR.value.visibilityStatus as PRForm["visibilityStatus"],
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
.pr-result-list {
  display: flex;
  flex-direction: column;
}

.stack,
.pr-result-list {
  gap: var(--sys-spacing-medium);
}

.pr-workspace-layout {
  width: 100%;
}

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.error-message {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-error);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.pr-result-list--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--sys-spacing-small);
}

.pr-result-list--scroll {
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
  @include mx.pu-font(control);
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
