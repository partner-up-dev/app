<template>
  <section class="pr-discovery-time-window-editor" data-testid="pr-discovery-time-window-editor">
    <div class="pr-discovery-time-window-editor__header">
      <span class="pr-discovery-time-window-editor__label">{{ label }}</span>
      <div class="pr-discovery-time-window-editor__mode-switcher">
        <span class="pr-discovery-time-window-editor__mode-label">{{ activeModeLabel }}</span>
        <PuMultiStopToggle
          v-model="activeModeToggleValue"
          :options="timeModeOptions"
          :aria-label="modeToggleAriaLabel"
          size="sm"
          :data-testid="modeToggleTestId"
        />
      </div>
    </div>

    <div class="pr-discovery-time-window-editor__pickers">
      <slot
        name="date-picker"
        :model-value="datePickerModelValue"
        :options="datePickerOptions"
        :update-model-value="handleDatePickerUpdate"
        :aria-label="datePickerAriaLabel"
        :empty-label="emptyLabel"
        :test-id="datePickerTestId"
      >
        <PuFormItem :label="datePickerAriaLabel" :for-id="datePickerTestId">
          <PuSelect
            :id="datePickerTestId"
            :model-value="datePickerModelValue"
            :options="dateSelectOptions"
            :placeholder="emptyLabel"
            :disabled="dateSelectOptions.length === 0"
            :data-testid="datePickerTestId"
            @update:model-value="handleDatePickerUpdate"
          />
        </PuFormItem>
      </slot>

      <slot
        name="time-picker"
        :model-value="timePickerModelValue"
        :options="timePickerOptions"
        :update-model-value="handleTimePickerUpdate"
        :aria-label="timePickerAriaLabel"
        :empty-label="emptyLabel"
        :test-id="timePickerTestId"
      >
        <PuFormItem :label="timePickerAriaLabel" :for-id="timePickerTestId">
          <PuSelect
            :id="timePickerTestId"
            :model-value="timePickerModelValue"
            :options="timeSelectOptions"
            :placeholder="emptyLabel"
            :disabled="timeSelectOptions.length === 0"
            :data-testid="timePickerTestId"
            @update:model-value="handleTimePickerUpdate"
          />
        </PuFormItem>
      </slot>
    </div>

    <label v-if="showDurationInput" class="pr-discovery-time-window-editor__duration-field">
      <span class="pr-discovery-time-window-editor__duration-label">
        {{ durationMinutesLabel }}
      </span>
      <input
        v-model.number="customDurationMinutes"
        class="pr-discovery-time-window-editor__select pr-discovery-time-window-editor__duration-input"
        type="number"
        min="5"
        step="5"
        inputmode="numeric"
        :data-testid="durationInputTestId"
      />
    </label>

    <p v-if="selectedDescription" class="pr-discovery-time-window-editor__hint">
      {{ selectedDescription }}
    </p>
    <p v-else-if="fixedDurationLabel" class="pr-discovery-time-window-editor__hint">
      {{ fixedDurationLabel }}
    </p>
  </section>
</template>

<script setup lang="ts">
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import {
  PuFormItem,
  PuMultiStopToggle,
  type PuMultiStopToggleOption,
  type PuMultiStopToggleValue,
  PuSelect,
  type PuSelectOption,
} from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import {
  buildAdvancedModeStartOptions,
  buildPRDiscoveryDateKey,
  buildPRDiscoveryFuzzyDateOptions,
  buildPRDiscoveryFuzzyTimeOptions,
  buildPRDiscoveryFuzzyTimeWindows,
  buildStartOptionsByDate,
  formatPRDiscoveryDurationLabel,
  formatPRDiscoveryTimeLabel,
  type PRDiscoveryFuzzyTimePreset,
} from "@/domains/pr/model/pr-discovery-form";
import type { TimeWindow } from "@/domains/pr/model/pr-discovery-time-window";
import {
  buildAllowEditAfterReadyForTimeWindowMode,
  findFuzzyPresetForTimeWindow,
  type PRDiscoveryTimeWindowEditorMode,
  type PRTimeWindowPickerOption,
  type PRTimeWindowPresetOption,
  timeWindowsEqual,
} from "@/domains/pr/model/pr-discovery-time-window";

type TimeModeOption = PuMultiStopToggleOption & {
  value: PRDiscoveryTimeWindowEditorMode;
};

const DEFAULT_CUSTOM_DURATION_MINUTES = 60;
const MINUTE_MS = 60 * 1000;

const props = withDefaults(
  defineProps<{
    modelValue: TimeWindow | null;
    allowEditAfterReady?: PRAllowEditAfterReady | null;
    presetOptions: readonly PRTimeWindowPresetOption[];
    durationMinutes: number | null;
    earliestLeadMinutes: number | null;
    defaultMode?: PRDiscoveryTimeWindowEditorMode;
    label?: string;
    modeToggleAriaLabel?: string;
    datePickerAriaLabel?: string;
    timePickerAriaLabel?: string;
    durationMinutesLabel?: string;
    emptyLabel?: string;
    testIdPrefix?: string;
    modeToggleTestId?: string | null;
    datePickerTestId?: string | null;
    timePickerTestId?: string | null;
    durationInputTestId?: string | null;
  }>(),
  {
    allowEditAfterReady: null,
    defaultMode: "NORMAL",
    label: "时间",
    modeToggleAriaLabel: "切换时间选择模式",
    datePickerAriaLabel: "选择日期",
    timePickerAriaLabel: "选择时间",
    durationMinutesLabel: "持续分钟",
    emptyLabel: "暂无可选时间",
    testIdPrefix: "pr-discovery-time-window-editor",
    modeToggleTestId: null,
    datePickerTestId: null,
    timePickerTestId: null,
    durationInputTestId: null,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: TimeWindow | null];
  "update:allowEditAfterReady": [value: PRAllowEditAfterReady | null];
}>();

const timeModeOptions: readonly TimeModeOption[] = [
  { value: "NORMAL", label: "普通" },
  { value: "ADVANCED", label: "高级" },
  { value: "FUZZY", label: "模糊" },
];

const activeMode = ref<PRDiscoveryTimeWindowEditorMode>(props.defaultMode);
const selectedDateKey = ref<string | null>(null);
const selectedTimeValue = ref<string | null>(null);
const selectedFuzzyDateValue = ref<string | null>(null);
const selectedFuzzyTimePreset = ref<PRDiscoveryFuzzyTimePreset | null>(null);
const customDurationMinutes = ref(DEFAULT_CUSTOM_DURATION_MINUTES);

const modeToggleTestId = computed(
  () => props.modeToggleTestId ?? `${props.testIdPrefix}.mode-toggle`,
);
const datePickerTestId = computed(() => props.datePickerTestId ?? `${props.testIdPrefix}.date`);
const timePickerTestId = computed(() => props.timePickerTestId ?? `${props.testIdPrefix}.time`);
const durationInputTestId = computed(
  () => props.durationInputTestId ?? `${props.testIdPrefix}.duration`,
);

const normalGroups = computed(() => buildStartOptionsByDate(props.presetOptions));
const advancedOptions = computed(() => buildAdvancedModeStartOptions(props.earliestLeadMinutes));
const advancedGroups = computed(() => buildStartOptionsByDate(advancedOptions.value));
const fuzzyDateOptions = computed(() => buildPRDiscoveryFuzzyDateOptions());
const fuzzyTimeOptions = computed(() => buildPRDiscoveryFuzzyTimeOptions());

const activeGroups = computed(() =>
  activeMode.value === "ADVANCED" ? advancedGroups.value : normalGroups.value,
);

const activeDateOptions = computed<PRTimeWindowPickerOption[]>(() => {
  if (activeMode.value === "FUZZY") {
    return fuzzyDateOptions.value.map((option) => ({
      label: option.label,
      value: option.value,
    }));
  }

  return activeGroups.value.map((group) => ({
    label: group.dateLabel,
    value: group.dateKey,
  }));
});

const activeTimeOptions = computed(() => {
  if (activeMode.value === "FUZZY") {
    return fuzzyTimeOptions.value.map((option) => ({
      label: option.label,
      value: option.value,
    }));
  }

  const group = activeGroups.value.find((item) => item.dateKey === selectedDateKey.value);
  return (group?.options ?? []).map((option) => ({
    label: formatPRDiscoveryTimeLabel(option.startAt),
    value: activeMode.value === "NORMAL" ? option.key : option.startAt,
  }));
});

const datePickerOptions = computed(() => activeDateOptions.value);
const timePickerOptions = computed(() => activeTimeOptions.value);

const datePickerModelValue = computed(() =>
  activeMode.value === "FUZZY" ? selectedFuzzyDateValue.value : selectedDateKey.value,
);
const timePickerModelValue = computed(() =>
  activeMode.value === "FUZZY" ? selectedFuzzyTimePreset.value : selectedTimeValue.value,
);

const dateSelectOptions = computed<PuSelectOption[]>(() =>
  datePickerOptions.value.map((option) => ({
    label: option.label,
    value: option.value,
  })),
);
const timeSelectOptions = computed<PuSelectOption[]>(() =>
  timePickerOptions.value.map((option) => ({
    label: option.label,
    value: option.value,
  })),
);

const activeModeLabel = computed(
  () => timeModeOptions.find((option) => option.value === activeMode.value)?.label ?? "",
);

const isTimeWindowEditorMode = (
  value: PuMultiStopToggleValue,
): value is PRDiscoveryTimeWindowEditorMode =>
  value === "NORMAL" || value === "ADVANCED" || value === "FUZZY";

const activeModeToggleValue = computed({
  get: () => activeMode.value,
  set: (value: PuMultiStopToggleValue) => {
    if (isTimeWindowEditorMode(value)) {
      activeMode.value = value;
    }
  },
});

const selectedNormalOption = computed(
  () => props.presetOptions.find((option) => option.key === selectedTimeValue.value) ?? null,
);

const fixedDurationLabel = computed(() =>
  activeMode.value === "ADVANCED" && props.durationMinutes !== null
    ? formatPRDiscoveryDurationLabel(props.durationMinutes)
    : "",
);

const showDurationInput = computed(
  () => activeMode.value === "ADVANCED" && props.durationMinutes === null,
);

const selectedDescription = computed(() =>
  activeMode.value === "NORMAL" ? (selectedNormalOption.value?.description?.trim() ?? "") : "",
);

const resolveAdvancedEndAt = (startAt: string): string | null => {
  const durationMinutes = props.durationMinutes ?? customDurationMinutes.value;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  return new Date(new Date(startAt).getTime() + durationMinutes * MINUTE_MS).toISOString();
};

const resolveSelectedTimeWindow = (): TimeWindow | null => {
  if (activeMode.value === "FUZZY") {
    if (!selectedFuzzyDateValue.value || !selectedFuzzyTimePreset.value) {
      return null;
    }
    const [timeWindow] = buildPRDiscoveryFuzzyTimeWindows(
      selectedFuzzyDateValue.value,
      selectedFuzzyTimePreset.value,
    );
    return timeWindow ? [timeWindow.startAt, timeWindow.endAt] : null;
  }

  if (activeMode.value === "NORMAL") {
    const option = selectedNormalOption.value;
    return option ? [option.startAt, option.endAt] : null;
  }

  const startAt = selectedTimeValue.value;
  return startAt ? [startAt, resolveAdvancedEndAt(startAt)] : null;
};

const emitSelectedTimeWindow = () => {
  const timeWindow = resolveSelectedTimeWindow();
  if (!timeWindowsEqual(timeWindow, props.modelValue)) {
    emit("update:modelValue", timeWindow);
  }

  const policy = buildAllowEditAfterReadyForTimeWindowMode(activeMode.value, timeWindow);
  if (JSON.stringify(policy) !== JSON.stringify(props.allowEditAfterReady ?? null)) {
    emit("update:allowEditAfterReady", policy);
  }
};

const setModeForExternalValue = (timeWindow: TimeWindow | null) => {
  if (timeWindow === null) {
    return;
  }

  const allowEditWindow = props.allowEditAfterReady?.timeWindow ?? null;
  if (allowEditWindow && timeWindowsEqual(timeWindow, [allowEditWindow[0], allowEditWindow[1]])) {
    const fuzzyPreset = findFuzzyPresetForTimeWindow(timeWindow);
    activeMode.value = "FUZZY";
    selectedFuzzyDateValue.value =
      fuzzyPreset?.dateValue ?? buildPRDiscoveryDateKey(timeWindow[0] ?? "");
    selectedFuzzyTimePreset.value = fuzzyPreset?.timePreset ?? "ALL_DAY";
    return;
  }

  const preset = props.presetOptions.find((option) =>
    timeWindowsEqual([option.startAt, option.endAt], timeWindow),
  );
  if (preset) {
    activeMode.value = "NORMAL";
    selectedDateKey.value = buildPRDiscoveryDateKey(preset.startAt);
    selectedTimeValue.value = preset.key;
    return;
  }

  if (timeWindow[0]) {
    activeMode.value = "ADVANCED";
    selectedDateKey.value = buildPRDiscoveryDateKey(timeWindow[0]);
    selectedTimeValue.value = timeWindow[0];
  }
};

const handleDatePickerUpdate = (value: string | number | null) => {
  const nextValue = value === null ? null : String(value);
  if (activeMode.value === "FUZZY") {
    selectedFuzzyDateValue.value = nextValue;
    return;
  }
  selectedDateKey.value = nextValue;
};

const handleTimePickerUpdate = (value: string | number | null) => {
  const nextValue = value === null ? null : String(value);
  if (activeMode.value === "FUZZY") {
    selectedFuzzyTimePreset.value = nextValue as PRDiscoveryFuzzyTimePreset | null;
    return;
  }
  selectedTimeValue.value = nextValue;
};

watch(
  () => [props.modelValue, props.allowEditAfterReady] as const,
  ([timeWindow]) => setModeForExternalValue(timeWindow),
  { immediate: true },
);

watch(
  () => props.defaultMode,
  (defaultMode) => {
    if (props.modelValue === null && !props.allowEditAfterReady?.timeWindow) {
      activeMode.value = defaultMode;
    }
  },
);

watch(
  [activeMode, activeGroups, fuzzyDateOptions, fuzzyTimeOptions],
  () => {
    if (activeMode.value === "FUZZY") {
      if (
        selectedFuzzyDateValue.value === null ||
        !fuzzyDateOptions.value.some((option) => option.value === selectedFuzzyDateValue.value)
      ) {
        selectedFuzzyDateValue.value = fuzzyDateOptions.value[0]?.value ?? null;
      }
      if (
        selectedFuzzyTimePreset.value === null ||
        !fuzzyTimeOptions.value.some((option) => option.value === selectedFuzzyTimePreset.value)
      ) {
        selectedFuzzyTimePreset.value = fuzzyTimeOptions.value[0]?.value ?? null;
      }
      return;
    }

    if (
      selectedDateKey.value === null ||
      !activeGroups.value.some((group) => group.dateKey === selectedDateKey.value)
    ) {
      selectedDateKey.value = activeGroups.value[0]?.dateKey ?? null;
    }
  },
  { immediate: true },
);

watch(
  [activeMode, activeTimeOptions, selectedDateKey],
  () => {
    if (activeMode.value === "FUZZY") {
      return;
    }
    if (
      selectedTimeValue.value !== null &&
      activeTimeOptions.value.some((option) => option.value === selectedTimeValue.value)
    ) {
      return;
    }
    selectedTimeValue.value = activeTimeOptions.value[0]?.value ?? null;
  },
  { immediate: true },
);

watch(
  [
    activeMode,
    selectedDateKey,
    selectedTimeValue,
    selectedFuzzyDateValue,
    selectedFuzzyTimePreset,
    customDurationMinutes,
  ],
  emitSelectedTimeWindow,
  { immediate: true },
);
</script>

<style scoped lang="scss">
.pr-discovery-time-window-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.pr-discovery-time-window-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.pr-discovery-time-window-editor__label {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(caption);
}

.pr-discovery-time-window-editor__mode-switcher {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
}

.pr-discovery-time-window-editor__mode-label {
  color: var(--sys-color-on-surface-variant);
  white-space: nowrap;
  @include mx.pu-font(caption);
}

.pr-discovery-time-window-editor__pickers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-xsmall);
}

.pr-discovery-time-window-editor__duration-field {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.pr-discovery-time-window-editor__duration-label {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(caption);
}

.pr-discovery-time-window-editor__select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.pr-discovery-time-window-editor__duration-input {
  flex: 0 0 min(8rem, 45%);
  width: auto;
  text-align: end;
}

.pr-discovery-time-window-editor__hint {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(support);
}
</style>
