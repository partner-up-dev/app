<template>
  <PRTimeWindowEditor
    class="form-mode-time-control"
    :model-value="editorTimeWindow"
    :allow-edit-after-ready="editorAllowEditAfterReady"
    :preset-options="presetOptions"
    :duration-minutes="durationMinutes"
    :earliest-lead-minutes="earliestLeadMinutes"
    :label="t('anchorEvent.formMode.timeTitle')"
    :mode-toggle-aria-label="t('anchorEvent.formMode.timeModeToggleAriaLabel')"
    :date-picker-aria-label="t('anchorEvent.formMode.dateWheelAriaLabel')"
    :time-picker-aria-label="t('anchorEvent.formMode.timeWheelAriaLabel')"
    :empty-label="t('anchorEvent.formMode.timePlaceholder')"
    test-id-prefix="anchor-event-form-mode.time"
    mode-toggle-test-id="anchor-event-form-mode.time-mode-toggle"
    date-picker-test-id="anchor-event-form-mode.time-date-wheel"
    time-picker-test-id="anchor-event-form-mode.time-time-wheel"
    @update:model-value="handleEditorTimeWindowUpdate"
    @update:allow-edit-after-ready="handleEditorAllowEditAfterReadyUpdate"
  >
    <template
      #date-picker="{ modelValue, options, updateModelValue, ariaLabel, emptyLabel, testId }"
    >
      <WheelPicker
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
      <WheelPicker
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
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import WheelPicker from "@/shared/ui/forms/WheelPicker.vue";
import PRTimeWindowEditor from "@/domains/event/ui/controls/PRTimeWindowEditor.vue";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import type { TimeWindow } from "@/domains/event/model/time-window-view";
import {
  buildFormModePointTimeWindows,
  formatFormModeDateLabel,
  formatFormModeFuzzySelectionLabel,
  formatFormModeTimeLabel,
  type FormModeTimeSelection,
  isValidFormModeDateTime,
} from "@/domains/event/model/form-mode";
import {
  findFuzzyPresetForTimeWindow,
  isCompleteTimeWindow,
  timeWindowsEqual,
  type PRTimeWindowPresetOption,
} from "@/domains/event/model/pr-time-window-editor";
import { formatFriendlyTimeWindowLabel } from "@/shared/datetime/formatLocalDateTime";

type StartOption = AnchorEventFormModeResponse["startOptions"][number];

const props = defineProps<{
  modelValue: FormModeTimeSelection | null;
  startOptions: readonly StartOption[];
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: FormModeTimeSelection | null];
  "update:allowEditAfterReady": [value: PRAllowEditAfterReady | null];
}>();

const { t } = useI18n();
const editorTimeWindow = ref<TimeWindow | null>(null);
const editorAllowEditAfterReady = ref<PRAllowEditAfterReady | null>(null);

const presetOptions = computed<PRTimeWindowPresetOption[]>(() =>
  props.startOptions
    .filter(
      (option) =>
        isValidFormModeDateTime(option.startAt) &&
        isValidFormModeDateTime(option.endAt),
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
      (option) =>
        option.startAt === timeWindow[0] && option.endAt === timeWindow[1],
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
      return formatFormModeFuzzySelectionLabel(
        fuzzyPreset.dateValue,
        fuzzyPreset.timePreset,
      );
    }
    return formatFriendlyTimeWindowLabel(timeWindow);
  }

  const startAt = timeWindow[0];
  return isValidFormModeDateTime(startAt)
    ? `${formatFormModeDateLabel(startAt)} ${formatFormModeTimeLabel(startAt)}`
    : "";
};

const buildSelectionFromEditorState = (
  timeWindow: TimeWindow | null,
  allowEditAfterReady: PRAllowEditAfterReady | null,
): FormModeTimeSelection | null => {
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
    timeWindows: buildFormModePointTimeWindows(timeWindow[0]),
    createTimeWindow: {
      startAt: timeWindow[0],
      endAt: timeWindow[1],
    },
  };
};

const emitSelection = () => {
  emit(
    "update:modelValue",
    buildSelectionFromEditorState(
      editorTimeWindow.value,
      editorAllowEditAfterReady.value,
    ),
  );
};

const handleEditorTimeWindowUpdate = (value: TimeWindow | null) => {
  editorTimeWindow.value = value;
  emitSelection();
};

const handleEditorAllowEditAfterReadyUpdate = (
  value: PRAllowEditAfterReady | null,
) => {
  editorAllowEditAfterReady.value = value;
  emit("update:allowEditAfterReady", value);
  emitSelection();
};

watch(
  () => props.modelValue,
  (selection) => {
    const nextTimeWindow: TimeWindow | null = selection?.createTimeWindow
      ? [
          selection.createTimeWindow.startAt,
          selection.createTimeWindow.endAt,
        ]
      : null;
    if (!timeWindowsEqual(editorTimeWindow.value, nextTimeWindow)) {
      editorTimeWindow.value = nextTimeWindow;
    }

    const nextAllowEditAfterReady: PRAllowEditAfterReady | null =
      selection?.mode === "FUZZY" && isCompleteTimeWindow(nextTimeWindow)
        ? { timeWindow: [nextTimeWindow[0], nextTimeWindow[1]] }
        : null;
    if (
      JSON.stringify(editorAllowEditAfterReady.value) !==
      JSON.stringify(nextAllowEditAfterReady)
    ) {
      editorAllowEditAfterReady.value = nextAllowEditAfterReady;
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.form-mode-time-control {
  display: flex;
  flex-direction: column;

  :deep(.pr-time-window-editor__label) {
    color: var(--sys-color-on-surface);
    @include mx.pu-font(title-medium);
  }

  :deep(.pr-time-window-editor__mode-label) {
    @include mx.pu-font(label-large);
  }

  :deep(.pr-time-window-editor__field-label) {
    display: none;
  }

  :deep(.pr-time-window-editor__hint) {
    margin: var(--sys-spacing-xsmall) 0 0;
    color: var(--sys-color-secondary);
    text-align: center;
    @include mx.pu-font(label-large);
  }
}
</style>
