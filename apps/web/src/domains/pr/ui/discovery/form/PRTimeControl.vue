<template>
  <PRTimeWindowEditor
    class="pr-discovery-time-control"
    :model-value="editorTimeWindow"
    :allow-edit-after-ready="editorAllowEditAfterReady"
    :preset-options="presetOptions"
    :duration-minutes="durationMinutes"
    :earliest-lead-minutes="earliestLeadMinutes"
    :default-mode="defaultMode"
    :label="t('prDiscovery.timeTitle')"
    :mode-toggle-aria-label="t('prDiscovery.timeModeToggleAriaLabel')"
    :date-picker-aria-label="t('prDiscovery.dateWheelAriaLabel')"
    :time-picker-aria-label="t('prDiscovery.timeWheelAriaLabel')"
    :empty-label="t('prDiscovery.timePlaceholder')"
    test-id-prefix="pr-discovery.time"
    mode-toggle-test-id="pr-discovery.time-mode-toggle"
    date-picker-test-id="pr-discovery.time-date-wheel"
    time-picker-test-id="pr-discovery.time-time-wheel"
    @update:model-value="handleEditorTimeWindowUpdate"
    @update:allow-edit-after-ready="handleEditorAllowEditAfterReadyUpdate"
  >
    <template
      #date-picker="{ modelValue, options, updateModelValue, ariaLabel, emptyLabel, testId }"
    >
      <PuWheelPicker
        :model-value="modelValue"
        :options="options"
        :item-height="42"
        :visible-count="3"
        :aria-label="ariaLabel"
        :empty-label="emptyLabel"
        :data-testid="testId"
        @update:model-value="updateModelValue"
      />
    </template>

    <template
      #time-picker="{ modelValue, options, updateModelValue, ariaLabel, emptyLabel, testId }"
    >
      <PuWheelPicker
        :model-value="modelValue"
        :options="options"
        :item-height="42"
        :visible-count="3"
        :aria-label="ariaLabel"
        :empty-label="emptyLabel"
        :data-testid="testId"
        @update:model-value="updateModelValue"
      />
    </template>
  </PRTimeWindowEditor>
</template>

<script setup lang="ts">
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend/contracts";
import { PuWheelPicker } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  buildPRDiscoveryPointTimeWindows,
  formatPRDiscoveryDateLabel,
  formatPRDiscoveryFuzzySelectionLabel,
  formatPRDiscoveryTimeLabel,
  isValidPRDiscoveryDateTime,
  type PRDiscoveryTimeMode,
  type PRDiscoveryTimeSelection,
} from "@/domains/pr/model/pr-discovery-form";
import type { TimeWindow } from "@/domains/pr/model/pr-discovery-time-window";
import {
  findFuzzyPresetForTimeWindow,
  isCompleteTimeWindow,
  type PRTimeWindowPresetOption,
  timeWindowsEqual,
} from "@/domains/pr/model/pr-discovery-time-window";
import type { PRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import PRTimeWindowEditor from "@/domains/pr/ui/discovery/form/PRTimeWindowEditor.vue";
import { formatFriendlyTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";

type StartOption = PRAuthoringOptions["startOptions"][number];

const props = defineProps<{
  modelValue: PRDiscoveryTimeSelection | null;
  startOptions: readonly StartOption[];
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  defaultMode: PRDiscoveryTimeMode;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: PRDiscoveryTimeSelection | null];
  "update:allowEditAfterReady": [value: PRAllowEditAfterReady | null];
}>();

const { t } = useI18n();
const editorTimeWindow = ref<TimeWindow | null>(null);
const editorAllowEditAfterReady = ref<PRAllowEditAfterReady | null>(null);

const presetOptions = computed<PRTimeWindowPresetOption[]>(() =>
  props.startOptions
    .filter(
      (option) =>
        isValidPRDiscoveryDateTime(option.startAt) && isValidPRDiscoveryDateTime(option.endAt),
    )
    .map((option) => ({
      key: option.key,
      startAt: option.startAt,
      endAt: option.endAt,
      description: option.description ?? null,
    })),
);

const findMatchingPreset = (timeWindow: TimeWindow | null): StartOption | null => {
  if (!isCompleteTimeWindow(timeWindow)) {
    return null;
  }
  return (
    props.startOptions.find(
      (option) => option.startAt === timeWindow[0] && option.endAt === timeWindow[1],
    ) ?? null
  );
};

const buildSelectionLabel = (
  timeWindow: TimeWindow,
  allowEditAfterReady: PRAllowEditAfterReady | null,
): string => {
  if (allowEditAfterReady?.timeWindow) {
    const fuzzyPreset = findFuzzyPresetForTimeWindow(timeWindow);
    if (fuzzyPreset) {
      return formatPRDiscoveryFuzzySelectionLabel(fuzzyPreset.dateValue, fuzzyPreset.timePreset);
    }
    return formatFriendlyTimeWindowLabel(timeWindow);
  }

  const startAt = timeWindow[0];
  return isValidPRDiscoveryDateTime(startAt)
    ? `${formatPRDiscoveryDateLabel(startAt)} ${formatPRDiscoveryTimeLabel(startAt)}`
    : "";
};

const buildSelectionFromEditorState = (
  timeWindow: TimeWindow | null,
  allowEditAfterReady: PRAllowEditAfterReady | null,
): PRDiscoveryTimeSelection | null => {
  if (!isCompleteTimeWindow(timeWindow)) {
    return null;
  }

  if (allowEditAfterReady?.timeWindow) {
    return {
      mode: "FUZZY",
      label: buildSelectionLabel(timeWindow, allowEditAfterReady),
      timeWindows: [{ startAt: timeWindow[0], endAt: timeWindow[1] }],
      createTimeWindow: { startAt: timeWindow[0], endAt: timeWindow[1] },
    };
  }

  const matchingPreset = findMatchingPreset(timeWindow);
  const mode = matchingPreset ? "NORMAL" : "ADVANCED";
  return {
    mode,
    label: buildSelectionLabel(timeWindow, null),
    timeWindows: buildPRDiscoveryPointTimeWindows(timeWindow[0]),
    createTimeWindow: {
      startAt: timeWindow[0],
      endAt: timeWindow[1],
    },
  };
};

const emitSelection = () => {
  emit(
    "update:modelValue",
    buildSelectionFromEditorState(editorTimeWindow.value, editorAllowEditAfterReady.value),
  );
};

const handleEditorTimeWindowUpdate = (value: TimeWindow | null) => {
  editorTimeWindow.value = value;
  emitSelection();
};

const handleEditorAllowEditAfterReadyUpdate = (value: PRAllowEditAfterReady | null) => {
  editorAllowEditAfterReady.value = value;
  emit("update:allowEditAfterReady", value);
  emitSelection();
};

watch(
  () => props.modelValue,
  (selection) => {
    const nextTimeWindow: TimeWindow | null = selection?.createTimeWindow
      ? [selection.createTimeWindow.startAt, selection.createTimeWindow.endAt]
      : null;
    if (!timeWindowsEqual(editorTimeWindow.value, nextTimeWindow)) {
      editorTimeWindow.value = nextTimeWindow;
    }

    const nextAllowEditAfterReady: PRAllowEditAfterReady | null =
      selection?.mode === "FUZZY" && isCompleteTimeWindow(nextTimeWindow)
        ? { timeWindow: [nextTimeWindow[0], nextTimeWindow[1]] }
        : null;
    if (
      JSON.stringify(editorAllowEditAfterReady.value) !== JSON.stringify(nextAllowEditAfterReady)
    ) {
      editorAllowEditAfterReady.value = nextAllowEditAfterReady;
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.pr-discovery-time-control {
  display: flex;
  flex-direction: column;

  :deep(.pr-time-window-editor__label) {
    color: var(--sys-color-on-surface);
    @include mx.pu-font(section);
  }

  :deep(.pr-time-window-editor__mode-label) {
    @include mx.pu-font(control);
  }

  :deep(.pr-time-window-editor__field-label) {
    display: none;
  }

  :deep(.pr-time-window-editor__hint) {
    margin: var(--sys-spacing-xsmall) 0 0;
    color: var(--sys-color-secondary);
    text-align: center;
    @include mx.pu-font(control);
  }
}
</style>
