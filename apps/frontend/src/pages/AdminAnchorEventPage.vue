<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminAnchorEvents.eventsTitle')">
        <template #actions>
          <Button
            appearance="pill"
            tone="outline"
            size="sm"
            type="button"
            @click="prepareNewEvent"
          >
            {{ t("adminAnchorEvents.newEventAction") }}
          </Button>
        </template>

        <div v-if="events.length === 0" class="hint">
          {{ t("adminAnchorEvents.emptyEvents") }}
        </div>
        <div v-else class="anchor-event-rail-list">
          <ChoiceCard
            v-for="event in events"
            :key="event.id"
            class="anchor-event-card"
            :active="!isCreatingEvent && selectedEventId === event.id"
            @click="selectEvent(event.id)"
          >
            <span>{{ event.title }}</span>
            <small>{{ event.status }}</small>
          </ChoiceCard>
        </div>
      </AdminRailPanel>
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
          <AnchorEventBasicSection
            v-if="activeAdminSection === 'anchor-event-basic'"
            v-model="eventForm"
            v-model:cover-uploading="isUploadingEventCoverImage"
            v-model:beta-group-qr-uploading="isUploadingEventBetaGroupQrCode"
            :save-label="eventSaveLabel"
            :save-disabled="isBasicSaveDisabled"
            :bounds-validation-message="eventBoundsValidationMessage"
            @save="handleSaveAnchorEventBasic"
          />

          <AnchorEventLocationsSection
            v-if="activeAdminSection === 'anchor-event-locations'"
            v-model="eventForm"
            :save-label="eventSaveLabel"
            :save-disabled="isLocationsSaveDisabled"
            @save="handleSaveAnchorEventLocations"
          />

          <AnchorEventRouteApplicationsSection
            v-if="activeAdminSection === 'anchor-event-route-applications'"
            :applications="routeApplications"
            :selected-event-id="selectedEventId"
            :disabled="isRouteApplicationReviewPending"
            @accept="handleAcceptRouteApplication"
            @reject="handleRejectRouteApplication"
          />

          <AnchorEventTimeSection
            v-if="activeAdminSection === 'anchor-event-time'"
            v-model="eventForm"
            :save-label="eventSaveLabel"
            :save-disabled="isTimePolicySaveDisabled"
            :time-pool-validation-message="timePoolValidationMessage"
            :policy-validation-message="policyValidationMessage"
            :preview-start-at="previewStartAt"
            @save="handleSaveEventTimePolicy"
          />

          <AnchorEventOtherSection
            v-if="activeAdminSection === 'anchor-event-other'"
            v-model="eventForm"
            :event-id="selectedEventId"
            :disabled="isCreatingEvent"
            :save-label="eventSaveLabel"
            :save-disabled="isOtherSettingsSaveDisabled"
            :feedback-questionnaire-templates="feedbackQuestionnaireTemplates"
            @save="handleSaveAnchorEventOtherSettings"
          />

          <AnchorEventTagsSection
            v-if="activeAdminSection === 'anchor-event-tags'"
            :event-id="selectedEventId"
            :disabled="isCreatingEvent"
          />

          <ErrorToast
            v-if="mutationErrorMessage"
            :message="mutationErrorMessage"
            @close="resetMutationErrors"
          />
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import AnchorEventBasicSection from "@/domains/admin/ui/anchor-event/sections/AnchorEventBasicSection.vue";
import AnchorEventLocationsSection from "@/domains/admin/ui/anchor-event/sections/AnchorEventLocationsSection.vue";
import AnchorEventOtherSection from "@/domains/admin/ui/anchor-event/sections/AnchorEventOtherSection.vue";
import AnchorEventRouteApplicationsSection from "@/domains/admin/ui/anchor-event/sections/AnchorEventRouteApplicationsSection.vue";
import AnchorEventTagsSection from "@/domains/admin/ui/anchor-event/sections/AnchorEventTagsSection.vue";
import AnchorEventTimeSection from "@/domains/admin/ui/anchor-event/sections/AnchorEventTimeSection.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import { useAdminNavigationSection } from "@/domains/admin/use-cases/useAdminNavigationSection";
import {
  type AcceptAdminRouteApplicationInput,
  type AdminAnchorEventWorkspaceResponse,
  useAcceptAdminRouteApplication,
  useAdminAnchorEventWorkspace,
  useRejectAdminRouteApplication,
} from "@/domains/admin/queries/useAdminAnchorEvents";
import { useCreateAnchorEvent } from "@/domains/admin/use-cases/anchor-event/useCreateAnchorEvent";
import {
  buildAnchorEventTimePoolConfig,
  normalizeLines,
  normalizeNullableNonNegativeInteger,
} from "@/domains/admin/use-cases/anchor-event/anchorEventMutationInput";
import { useUpdateAnchorEventBasic } from "@/domains/admin/use-cases/anchor-event/useUpdateAnchorEventBasic";
import { useUpdateAnchorEventLocations } from "@/domains/admin/use-cases/anchor-event/useUpdateAnchorEventLocations";
import { useUpdateAnchorEventOtherSettings } from "@/domains/admin/use-cases/anchor-event/useUpdateAnchorEventOtherSettings";
import {
  useUpdateAnchorEventTimePolicy,
} from "@/domains/admin/use-cases/anchor-event/useUpdateAnchorEventTimePolicy";
import type {
  AnchorEventEditorForm,
  EditableMeetingPointForm,
} from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import { validateManualPartnerBounds } from "@/lib/validation";

type Workspace = NonNullable<AdminAnchorEventWorkspaceResponse>;
type EventRecord = Workspace["events"][number];

type EventForm = AnchorEventEditorForm;

const DEFAULT_CONFIRMATION_START_OFFSET_MINUTES = 120;
const DEFAULT_CONFIRMATION_END_OFFSET_MINUTES = 30;
const DEFAULT_JOIN_LOCK_OFFSET_MINUTES = 30;

const emptyEventForm = (): EventForm => ({
  title: "",
  type: "",
  description: "",
  placePoolMode: "location",
  locationPoolText: "",
  routePool: [],
  meetingPointDescription: "",
  meetingPointImageUrl: "",
  locationMeetingPoints: {},
  joinGateConfig: [],
  participationFrequencyLimit: null,
  feedbackQuestionnaireTemplateId: null,
  defaultPrNotes: "",
  durationMinutes: null,
  earliestLeadMinutes: null,
  absoluteRulesText: "",
  recurringRulesText: "",
  defaultMinPartners: null,
  defaultMaxPartners: null,
  defaultConfirmationEnabled: true,
  defaultConfirmationStartOffsetMinutes:
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  defaultConfirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  coverImage: "",
  betaGroupQrCode: "",
  prCreationPolicy: "USER_AND_ADMIN",
  fullPrExpansionPolicy: "DISABLED",
  prTimeWindowEditorDefaultMode: "NORMAL",
  status: "ACTIVE",
});

const formatRuleDescriptionSuffix = (
  description: string | null | undefined,
): string => {
  const normalized = description?.trim() ?? "";
  return normalized ? ` | ${normalized}` : "";
};

const toEventForm = (event: EventRecord): EventForm => ({
  title: event.title,
  type: event.type,
  description: event.description ?? "",
  placePoolMode: event.routePool.length > 0 ? "route" : "location",
  locationPoolText: event.locationPool.join("\n"),
  routePool: event.routePool,
  meetingPointDescription: event.meetingPoint?.description ?? "",
  meetingPointImageUrl: event.meetingPoint?.imageUrl ?? "",
  locationMeetingPoints: toEditableLocationMeetingPoints(
    event.locationMeetingPoints,
  ),
  joinGateConfig: event.joinGateConfig,
  participationFrequencyLimit: event.participationFrequencyLimit,
  feedbackQuestionnaireTemplateId: event.feedbackQuestionnaireTemplateId ?? null,
  defaultPrNotes: event.defaultPrNotes ?? "",
  durationMinutes: event.timePoolConfig.durationMinutes ?? null,
  earliestLeadMinutes: event.timePoolConfig.earliestLeadMinutes ?? null,
  absoluteRulesText: event.timePoolConfig.startRules
    .filter((rule) => rule.kind === "ABSOLUTE")
    .map(
      (rule) =>
        `${rule.startAt}${formatRuleDescriptionSuffix(rule.description)}`,
    )
    .join("\n"),
  recurringRulesText: event.timePoolConfig.startRules
    .filter((rule) => rule.kind === "RECURRING")
    .map(
      (rule) =>
        `${rule.weekdays.join(",")} ${rule.timeOfDay}${formatRuleDescriptionSuffix(
          rule.description,
        )}`,
    )
    .join("\n"),
  defaultMinPartners: event.defaultMinPartners,
  defaultMaxPartners: event.defaultMaxPartners,
  defaultConfirmationEnabled: event.defaultConfirmationEnabled,
  defaultConfirmationStartOffsetMinutes:
    event.defaultConfirmationStartOffsetMinutes ??
    DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  defaultConfirmationEndOffsetMinutes:
    event.defaultConfirmationEndOffsetMinutes ??
    DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  defaultJoinLockOffsetMinutes:
    event.defaultJoinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
  coverImage: event.coverImage ?? "",
  betaGroupQrCode: event.betaGroupQrCode ?? "",
  prCreationPolicy: event.prCreationPolicy,
  fullPrExpansionPolicy: event.fullPrExpansionPolicy,
  prTimeWindowEditorDefaultMode: event.prTimeWindowEditorDefaultMode,
  status: event.status as EventForm["status"],
});

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const activeAdminSection = useAdminNavigationSection("anchor-event-basic", [
  "anchor-event-basic",
  "anchor-event-locations",
  "anchor-event-route-applications",
  "anchor-event-time",
  "anchor-event-tags",
  "anchor-event-other",
] as const);
const workspaceQuery = useAdminAnchorEventWorkspace(isAdmin);
const createAnchorEventUseCase = useCreateAnchorEvent();
const updateBasicUseCase = useUpdateAnchorEventBasic();
const updateLocationsUseCase = useUpdateAnchorEventLocations();
const updateOtherSettingsUseCase = useUpdateAnchorEventOtherSettings();
const updateTimePolicyUseCase = useUpdateAnchorEventTimePolicy();
const acceptRouteApplicationMutation = useAcceptAdminRouteApplication();
const rejectRouteApplicationMutation = useRejectAdminRouteApplication();

const selectedEventIdRaw = ref("");
const isCreatingEvent = ref(false);
const eventForm = ref<EventForm>(emptyEventForm());
const isUploadingEventCoverImage = ref(false);
const isUploadingEventBetaGroupQrCode = ref(false);

const workspace = computed<Workspace | null>(
  () => workspaceQuery.data.value ?? null,
);
const events = computed<EventRecord[]>(() => workspace.value?.events ?? []);
const feedbackQuestionnaireTemplates = computed(
  () => workspace.value?.feedbackQuestionnaireTemplates ?? [],
);
const routeApplications = computed(
  () => workspace.value?.routeApplications ?? [],
);

const selectedEventId = computed<number | null>(() => {
  const parsed = Number(selectedEventIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedEvent = computed<EventRecord | null>(
  () =>
    events.value.find((event) => event.id === selectedEventId.value) ?? null,
);

const previewStartAt = computed(
  () => selectedEvent.value?.timeWindows[0]?.timeWindow[0] ?? null,
);

const toEditableLocationMeetingPoints = (
  map: Record<
    string,
    { description: string | null; imageUrl: string | null } | null | undefined
  >,
): Record<string, EditableMeetingPointForm> => {
  const result: Record<string, EditableMeetingPointForm> = {};
  for (const [location, meetingPoint] of Object.entries(map)) {
    const normalizedLocation = location.trim();
    if (!normalizedLocation || !meetingPoint) {
      continue;
    }
    result[normalizedLocation] = {
      description: meetingPoint.description ?? "",
      imageUrl: meetingPoint.imageUrl ?? "",
    };
  }
  return result;
};

const eventBoundsValidationMessage = computed(() =>
  validateManualPartnerBounds(
    normalizeNullableNonNegativeInteger(eventForm.value.defaultMinPartners),
    normalizeNullableNonNegativeInteger(eventForm.value.defaultMaxPartners),
  ),
);

const timePoolValidationMessage = computed(() => {
  const config = buildAnchorEventTimePoolConfig(eventForm.value);
  if (config.startRules.length > 0 && config.durationMinutes === null) {
    return t("adminPR.timePoolDurationRequired");
  }
  if (
    config.startRules.some((rule) => rule.kind === "RECURRING") &&
    config.earliestLeadMinutes === null
  ) {
    return t("adminPR.timePoolEarliestLeadRequired");
  }
  if (
    normalizeLines(eventForm.value.recurringRulesText).length > 0 &&
    config.startRules.filter((rule) => rule.kind === "RECURRING").length !==
      normalizeLines(eventForm.value.recurringRulesText).length
  ) {
    return t("adminPR.recurringRulesFormatError");
  }
  return null;
});

const policyValidationMessage = computed(() => {
  if (!eventForm.value.defaultConfirmationEnabled) {
    return null;
  }
  if (
    eventForm.value.defaultConfirmationStartOffsetMinutes <=
    eventForm.value.defaultConfirmationEndOffsetMinutes
  ) {
    return t("adminPR.policyValidationStartBeforeEnd");
  }
  if (
    eventForm.value.defaultJoinLockOffsetMinutes <
    eventForm.value.defaultConfirmationEndOffsetMinutes
  ) {
    return t("adminPR.policyValidationJoinLockAfterConfirmationEnd");
  }
  return null;
});

const isSavingAnchorEvent = computed(
  () =>
    createAnchorEventUseCase.isPending.value ||
    updateBasicUseCase.isPending.value ||
    updateLocationsUseCase.isPending.value ||
    updateOtherSettingsUseCase.isPending.value ||
    updateTimePolicyUseCase.isPending.value,
);
const isRouteApplicationReviewPending = computed(
  () =>
    acceptRouteApplicationMutation.isPending.value ||
    rejectRouteApplicationMutation.isPending.value,
);

const isCreateAnchorEventDisabled = computed(
  () =>
    isSavingAnchorEvent.value ||
    Boolean(eventBoundsValidationMessage.value) ||
    Boolean(timePoolValidationMessage.value) ||
    Boolean(policyValidationMessage.value) ||
    isUploadingEventCoverImage.value ||
    isUploadingEventBetaGroupQrCode.value,
);

const isBasicSaveDisabled = computed(() =>
  isCreatingEvent.value
    ? isCreateAnchorEventDisabled.value
    : isSavingAnchorEvent.value ||
      Boolean(eventBoundsValidationMessage.value) ||
      isUploadingEventCoverImage.value ||
      isUploadingEventBetaGroupQrCode.value,
);

const isLocationsSaveDisabled = computed(() =>
  isCreatingEvent.value
    ? isCreateAnchorEventDisabled.value
    : isSavingAnchorEvent.value,
);

const isTimePolicySaveDisabled = computed(() =>
  isCreatingEvent.value
    ? isCreateAnchorEventDisabled.value
    : isSavingAnchorEvent.value ||
      Boolean(timePoolValidationMessage.value) ||
      Boolean(policyValidationMessage.value),
);

const isOtherSettingsSaveDisabled = computed(() =>
  isCreatingEvent.value
    ? isCreateAnchorEventDisabled.value
    : isSavingAnchorEvent.value,
);

const eventSaveLabel = computed(() =>
  isSavingAnchorEvent.value
    ? t("adminPR.saving")
    : isCreatingEvent.value
      ? t("adminPR.createEventAction")
      : t("adminPR.saveEventAction"),
);

const mutationErrorMessage = computed(
  () =>
    createAnchorEventUseCase.error.value?.message ||
    updateBasicUseCase.error.value?.message ||
    updateLocationsUseCase.error.value?.message ||
    updateOtherSettingsUseCase.error.value?.message ||
    updateTimePolicyUseCase.error.value?.message ||
    acceptRouteApplicationMutation.error.value?.message ||
    rejectRouteApplicationMutation.error.value?.message ||
    null,
);

watch(
  [events, isAdmin, isCreatingEvent],
  ([nextEvents, adminReady, creating]) => {
    if (!adminReady || creating || nextEvents.length === 0) {
      if (!adminReady || nextEvents.length === 0) {
        selectedEventIdRaw.value = "";
      }
      return;
    }
    if (
      !nextEvents.some((event) => String(event.id) === selectedEventIdRaw.value)
    ) {
      selectedEventIdRaw.value = String(nextEvents[0].id);
    }
  },
  { immediate: true },
);

watch(
  [selectedEvent, isCreatingEvent],
  ([event, creating]) => {
    if (creating || !event) {
      eventForm.value = emptyEventForm();
      return;
    }
    eventForm.value = toEventForm(event);
  },
  { immediate: true },
);

const prepareNewEvent = () => {
  isCreatingEvent.value = true;
  selectedEventIdRaw.value = "";
  eventForm.value = emptyEventForm();
};

const selectEvent = (eventId: number) => {
  isCreatingEvent.value = false;
  selectedEventIdRaw.value = String(eventId);
};

const resetMutationErrors = () => {
  createAnchorEventUseCase.reset();
  updateBasicUseCase.reset();
  updateLocationsUseCase.reset();
  updateOtherSettingsUseCase.reset();
  updateTimePolicyUseCase.reset();
  acceptRouteApplicationMutation.reset();
  rejectRouteApplicationMutation.reset();
};

const handleCreateAnchorEvent = async () => {
  if (
    eventBoundsValidationMessage.value ||
    timePoolValidationMessage.value ||
    policyValidationMessage.value ||
    isUploadingEventCoverImage.value ||
    isUploadingEventBetaGroupQrCode.value
  ) {
    return;
  }

  try {
    const result = await createAnchorEventUseCase.createAnchorEvent(
      eventForm.value,
    );
    isCreatingEvent.value = false;
    selectedEventIdRaw.value = String(result.id);
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleSaveAnchorEventBasic = async () => {
  if (isCreatingEvent.value || selectedEvent.value === null) {
    await handleCreateAnchorEvent();
    return;
  }
  if (
    eventBoundsValidationMessage.value ||
    isUploadingEventCoverImage.value ||
    isUploadingEventBetaGroupQrCode.value
  ) {
    return;
  }

  try {
    const result = await updateBasicUseCase.updateBasic({
      event: selectedEvent.value,
      draft: eventForm.value,
    });
    selectedEventIdRaw.value = String(result.id);
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleSaveAnchorEventLocations = async () => {
  if (isCreatingEvent.value || selectedEvent.value === null) {
    await handleCreateAnchorEvent();
    return;
  }

  try {
    const result = await updateLocationsUseCase.updateLocations({
      event: selectedEvent.value,
      draft: eventForm.value,
    });
    selectedEventIdRaw.value = String(result.id);
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleSaveEventTimePolicy = async () => {
  if (timePoolValidationMessage.value || policyValidationMessage.value) {
    return;
  }

  const event = selectedEvent.value;
  if (isCreatingEvent.value || event === null) {
    await handleCreateAnchorEvent();
    return;
  }

  try {
    const result = await updateTimePolicyUseCase.updateTimePolicy({
      event,
      draft: eventForm.value,
    });
    selectedEventIdRaw.value = String(result.id);
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleSaveAnchorEventOtherSettings = async () => {
  if (isCreatingEvent.value || selectedEvent.value === null) {
    await handleCreateAnchorEvent();
    return;
  }

  try {
    const result = await updateOtherSettingsUseCase.updateOtherSettings({
      event: selectedEvent.value,
      draft: eventForm.value,
    });
    selectedEventIdRaw.value = String(result.id);
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleAcceptRouteApplication = async (
  payload: AcceptAdminRouteApplicationInput,
) => {
  try {
    await acceptRouteApplicationMutation.mutateAsync(payload);
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

const handleRejectRouteApplication = async (payload: {
  applicationId: number;
  rejectReason: string | null;
}) => {
  try {
    await rejectRouteApplicationMutation.mutateAsync(payload);
  } catch {
    // Mutation state already drives page-level feedback.
  }
};

</script>

<style lang="scss" scoped>
.stack,
.anchor-event-rail-list {
  display: flex;
  flex-direction: column;
}

.stack,
.anchor-event-rail-list {
  gap: var(--sys-spacing-medium);
}

.hint {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

</style>
