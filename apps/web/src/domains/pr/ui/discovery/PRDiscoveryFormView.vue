<template>
  <section class="pr-discovery-form-view" data-testid="prd.form.view">
    <div v-if="!showResult" class="pr-discovery-form-view__builder">
      <PRCarouselPlaceSelector
        v-model="selectedPlace"
        :place-selector="placeSelector"
        @update:model-value="handlePlaceChange"
        @create-location="emit('location-application')"
        @create-route="emit('route-application')"
      />

      <PRTimeControl
        v-model="selectedTime"
        :start-options="effectiveStartOptions"
        :duration-minutes="props.options?.durationMinutes ?? null"
        :earliest-lead-minutes="props.options?.earliestLeadMinutes ?? null"
        :default-mode="props.options?.timeWindowEditorDefaultMode ?? 'NORMAL'"
        @update:model-value="handleTimeChange"
        @update:allow-edit-after-ready="handleAllowEditAfterReadyChange"
      />

      <PRPreferenceControl
        v-if="props.options"
        v-model="selectedPreferences"
        :type="props.options.type"
        :preset-tags="props.options.preferenceTags"
        @update:model-value="handlePreferenceChange"
      />

      <PuInlineNotice v-if="props.errorMessage" tone="error" :message="props.errorMessage" />

      <div class="form-actions">
        <PuButton shape="rect" tone="neutral" variant="outline" @click="emit('view-all')">
          {{ t("prDiscovery.formMode.viewAllSessions") }}
        </PuButton>
        <PRLongPressButton
          :label="t('prDiscovery.formMode.primaryCta')"
          :pending-label="t('prDiscovery.formMode.primaryCtaPending')"
          :pending="props.pending"
          :disabled="!canSubmit"
          data-testid="prd.form.primary"
          @complete="handleSubmit"
        />
      </div>
    </div>

    <PRNoMatchResult
      v-else
      :type="props.options?.type ?? ''"
      :candidates="visibleCandidates"
      :create-pending="props.pending"
      :create-disabled="!props.showCreate"
      :show-create-fallback="props.showCreate"
      :create-error-message="props.errorMessage ?? null"
      :resolve-cover-image="resolveCoverImage"
      @candidate-detail="handleCandidateDetail"
      @join-candidate-joined="(id, rank) => emit('candidate-join-joined', id, rank)"
      @join-candidate-success-closed="(id, rank) => emit('candidate-join-success-closed', id, rank)"
      @create-fallback="emit('create', buildSelection())"
    />
    <Teleport to="body">
      <div v-if="splashPhase !== 'IDLE'" class="pr-discovery-form-splash" aria-hidden="true">
        <LiquidWaveSplash
          :phase="splashLiquidPhase"
          :origin-rect="splashOrigin"
          :duration-ms="980"
          @fill-complete="handleSplashFill"
          @drain-complete="handleSplashDrain"
        />
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend/contracts";
import { PuButton, PuInlineNotice } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDiscoveryTimeSelection } from "@/domains/pr/model/pr-discovery-form";
import {
  formatPRDiscoveryDateLabel,
  formatPRDiscoveryTimeLabel,
  pickStableGalleryImage,
} from "@/domains/pr/model/pr-discovery-form";
import {
  buildPRDiscoveryPlaceOptions,
  findPRDiscoveryPlaceOption,
  type PRDiscoveryPlaceOption,
  type PRDiscoveryPlaceSelection,
  type PRDiscoveryPlaceSelectorView,
} from "@/domains/pr/model/pr-discovery-place-options";
import type { PRDiscoveryRecommendationCandidate } from "@/domains/pr/model/pr-discovery-types";
import type { PRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import PRCarouselPlaceSelector from "@/domains/pr/ui/discovery/form/PRCarouselPlaceSelector.vue";
import type { LongPressOriginRect } from "@/domains/pr/ui/discovery/form/PRLongPressButton.vue";
import PRLongPressButton from "@/domains/pr/ui/discovery/form/PRLongPressButton.vue";
import PRNoMatchResult from "@/domains/pr/ui/discovery/form/PRNoMatchResult.vue";
import PRPreferenceControl from "@/domains/pr/ui/discovery/form/PRPreferenceControl.vue";
import PRTimeControl from "@/domains/pr/ui/discovery/form/PRTimeControl.vue";
import type {
  LiquidSplashOriginRect,
  LiquidSplashPhase,
} from "@/processes/route-handoff/LiquidWaveSplash.vue";
import LiquidWaveSplash from "@/processes/route-handoff/LiquidWaveSplash.vue";
import { useMatchedPRHandoff } from "@/processes/route-handoff/useMatchedPRHandoff";

export type PRDiscoveryFormSelection = {
  place: PRDiscoveryPlaceSelection;
  timeWindows: Array<{ startAt: string; endAt: string }>;
  createTimeWindow: { startAt: string; endAt: string | null } | null;
  preferences: string[];
  allowEditAfterReady: PRAllowEditAfterReady | null;
};

const props = withDefaults(
  defineProps<{
    options?: PRAuthoringOptions | null;
    candidates?: readonly PRDiscoveryRecommendationCandidate[];
    matchedCandidate?: PRDiscoveryRecommendationCandidate | null;
    pending?: boolean;
    errorMessage?: string | null;
    showCreate?: boolean;
    noMatchResolved?: boolean;
  }>(),
  {
    options: null,
    candidates: () => [],
    matchedCandidate: null,
    pending: false,
    errorMessage: null,
    showCreate: true,
    noMatchResolved: false,
  },
);
const { t } = useI18n();

const emit = defineEmits<{
  submit: [selection: PRDiscoveryFormSelection, originRect?: LongPressOriginRect];
  create: [selection: PRDiscoveryFormSelection];
  "candidate-detail": [candidate: PRDiscoveryRecommendationCandidate];
  "candidate-join-joined": [prId: number, rank: number];
  "candidate-join-success-closed": [prId: number, rank: number];
  "location-application": [];
  "route-application": [];
  "selection-change": [selection: PRDiscoveryFormSelection];
  "view-all": [];
}>();

const selectedPlace = ref<PRDiscoveryPlaceSelection | null>(null);
const selectedTime = ref<PRDiscoveryTimeSelection | null>(null);
const selectedPreferences = ref<string[]>([]);
const allowEditAfterReady = ref<PRAllowEditAfterReady | null>(null);
const submitted = ref(false);
const splashPhase = ref<"IDLE" | "FILLING" | "HOLDING" | "DRAINING">("IDLE");
const splashOrigin = ref<LiquidSplashOriginRect | null>(null);
const matchedPRHandoff = useMatchedPRHandoff();
const handoffStartedFor = ref<number | null>(null);
const defaultAppliedType = ref<string | null>(null);
const placeOptions = computed<PRDiscoveryPlaceOption[]>(() =>
  buildPRDiscoveryPlaceOptions({
    locations: props.options?.locationOptions ?? [],
    routes: props.options?.routeOptions ?? [],
  }),
);
const placeSelector = computed<PRDiscoveryPlaceSelectorView>(() => {
  if (props.options?.routeOptions.length) {
    return {
      kind: "route",
      labelKey: "prDiscovery.placeSelector.routeLabel",
      placeholderKey: "prDiscovery.placeSelector.routePlaceholder",
      ariaLabelKey: "prDiscovery.placeSelector.routeAriaLabel",
      applyActionKey: "prDiscovery.placeSelector.applyRoute",
      options: placeOptions.value,
    };
  }
  if (props.options?.locationOptions.length) {
    return {
      kind: "location",
      labelKey: "prDiscovery.placeSelector.locationLabel",
      placeholderKey: "prDiscovery.placeSelector.locationPlaceholder",
      ariaLabelKey: "prDiscovery.placeSelector.locationAriaLabel",
      applyActionKey: "prDiscovery.placeSelector.applyLocation",
      options: placeOptions.value,
    };
  }
  return {
    kind: "none",
    labelKey: "prDiscovery.placeSelector.emptyPlaceholder",
    placeholderKey: "prDiscovery.placeSelector.emptyPlaceholder",
    ariaLabelKey: "prDiscovery.form.placeAriaLabel",
    applyActionKey: null,
    options: placeOptions.value,
  };
});
const selectedPlaceOption = computed(() =>
  findPRDiscoveryPlaceOption(placeOptions.value, selectedPlace.value),
);
const effectiveStartOptions = computed(() => {
  const options = props.options?.startOptions ?? [];
  const availableStartKeys = selectedPlaceOption.value?.availableStartKeys;
  if (!availableStartKeys) return options;
  const allowed = new Set(availableStartKeys);
  return options.filter((option) => allowed.has(option.key));
});
const showResult = computed(
  () =>
    Boolean(props.noMatchResolved) &&
    !props.matchedCandidate &&
    (props.candidates.length > 0 || !props.showCreate),
);
const visibleCandidates = computed(() =>
  props.matchedCandidate ? [props.matchedCandidate] : props.candidates,
);
const splashLiquidPhase = computed<LiquidSplashPhase>(() =>
  splashPhase.value === "FILLING" ? "FILL" : splashPhase.value === "DRAINING" ? "DRAIN" : "HOLD",
);
const canSubmit = computed(() =>
  Boolean(
    selectedPlace.value &&
    selectedTime.value?.timeWindows.length &&
    selectedTime.value.createTimeWindow?.startAt &&
    !props.pending,
  ),
);
const buildSelection = (): PRDiscoveryFormSelection => ({
  place: selectedPlace.value ?? { kind: "location", location: "" },
  timeWindows: (selectedTime.value?.timeWindows ?? []).map((window) => ({ ...window })),
  createTimeWindow: selectedTime.value?.createTimeWindow
    ? { ...selectedTime.value.createTimeWindow }
    : null,
  preferences: [...selectedPreferences.value],
  allowEditAfterReady: allowEditAfterReady.value,
});
const handleSubmit = (originRect: LongPressOriginRect): void => {
  submitted.value = true;
  splashOrigin.value = originRect;
  splashPhase.value = "FILLING";
  emit("submit", buildSelection(), originRect);
};
const resetAfterSelectionChange = (): void => {
  submitted.value = false;
  if (splashPhase.value !== "IDLE") {
    splashPhase.value = "IDLE";
    splashOrigin.value = null;
  }
};
const handlePlaceChange = (value: PRDiscoveryPlaceSelection | null): void => {
  selectedPlace.value = value;
  resetAfterSelectionChange();
  emit("selection-change", buildSelection());
};
const handleTimeChange = (value: PRDiscoveryTimeSelection | null): void => {
  selectedTime.value = value;
  resetAfterSelectionChange();
  emit("selection-change", buildSelection());
};
const handlePreferenceChange = (value: string[]): void => {
  selectedPreferences.value = [...value];
  resetAfterSelectionChange();
  emit("selection-change", buildSelection());
};
const handleAllowEditAfterReadyChange = (value: PRAllowEditAfterReady | null): void => {
  allowEditAfterReady.value = value;
  resetAfterSelectionChange();
  emit("selection-change", buildSelection());
};
const handleCandidateDetail = (prId: number): void => {
  const candidate = visibleCandidates.value.find((item) => item.prId === prId);
  if (candidate) emit("candidate-detail", candidate);
};
const beginMatchedHandoffWhenReady = (): void => {
  const candidate = props.matchedCandidate;
  if (!candidate || handoffStartedFor.value === candidate.prId) return;
  if (!splashOrigin.value) return;
  handoffStartedFor.value = candidate.prId;
  matchedPRHandoff.begin({ prId: candidate.prId, originRect: splashOrigin.value });
};
const handleSplashFill = (): void => {
  if (splashPhase.value === "FILLING") splashPhase.value = "HOLDING";
  beginMatchedHandoffWhenReady();
};
const handleSplashDrain = (): void => {
  splashPhase.value = "IDLE";
  splashOrigin.value = null;
};
const resolveCoverImage = (location: string | null): string | null => {
  const option = placeOptions.value.find(
    (item) => item.kind === "location" && item.locationId === location,
  );
  return option?.kind === "location"
    ? pickStableGalleryImage(option.gallery, option.locationId)
    : null;
};
const applyDefaultSelection = (): void => {
  const options = props.options;
  const type = options?.type;
  const defaultSelection = options?.defaultSelection;
  if (!type || defaultAppliedType.value === type || !defaultSelection) return;
  const location = placeOptions.value.find(
    (option) =>
      option.kind === "location" &&
      option.locationId === defaultSelection.locationId &&
      !option.disabled,
  );
  if (!location || location.kind !== "location") return;
  selectedPlace.value = { kind: "location", location: location.locationId };
  const startOption = effectiveStartOptions.value.find(
    (option) => option.startAt === defaultSelection.startAt,
  );
  if (startOption) {
    selectedTime.value = {
      mode: "NORMAL",
      label: `${formatPRDiscoveryDateLabel(startOption.startAt)} ${formatPRDiscoveryTimeLabel(startOption.startAt)}`,
      timeWindows: [{ startAt: startOption.startAt, endAt: startOption.startAt }],
      createTimeWindow: { startAt: startOption.startAt, endAt: startOption.endAt },
    };
  }
  defaultAppliedType.value = type;
};

watch(
  [placeOptions, () => props.options?.defaultSelection],
  (options) => {
    applyDefaultSelection();
    if (selectedPlace.value || !options[0].length) return;
    const first = options[0].find((option) => !option.disabled);
    selectedPlace.value =
      first?.kind === "location"
        ? { kind: "location", location: first.locationId }
        : first?.kind === "route"
          ? { kind: "route", route: first.route }
          : null;
  },
  { immediate: true },
);
watch(
  () => props.options?.type,
  () => {
    selectedPlace.value = null;
    selectedTime.value = null;
    selectedPreferences.value = [];
    allowEditAfterReady.value = null;
    submitted.value = false;
    handoffStartedFor.value = null;
    defaultAppliedType.value = null;
    matchedPRHandoff.cancel();
    queueMicrotask(applyDefaultSelection);
  },
  { immediate: true },
);
watch(
  () => props.matchedCandidate,
  (candidate) => {
    if (candidate) {
      if (splashPhase.value === "FILLING") splashPhase.value = "HOLDING";
      beginMatchedHandoffWhenReady();
    } else if (submitted.value) splashPhase.value = "DRAINING";
    else {
      handoffStartedFor.value = null;
      matchedPRHandoff.cancel();
    }
  },
);
</script>

<style scoped lang="scss">
.pr-discovery-form-view {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  padding-bottom: var(--sys-spacing-large);
}

.pr-discovery-form-view__builder {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
  margin-top: auto;
  padding-top: var(--sys-spacing-small);
}

.form-actions > :deep(button) {
  flex: 1 1 14rem;
  border-radius: 0;
}

.pr-discovery-form-splash {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overflow: hidden;
  pointer-events: none;
}
</style>
