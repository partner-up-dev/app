<template>
  <section class="pr-time-window-editor" data-testid="pr-time-window-editor">
    <div class="pr-time-window-editor__header">
      <span class="pr-time-window-editor__label">{{ label }}</span>
      <div class="pr-time-window-editor__mode-switcher">
        <span class="pr-time-window-editor__mode-label">{{ activeModeLabel }}</span>
        <MultiStopToggle
          v-model="activeMode"
          :options="timeModeOptions"
          :aria-label="modeToggleAriaLabel"
          size="sm"
          :data-testid="modeToggleTestId"
        />
      </div>
    </div>

    <div class="pr-time-window-editor__pickers">
      <slot
        name="date-picker"
        :model-value="datePickerModelValue"
        :options="datePickerOptions"
        :update-model-value="handleDatePickerUpdate"
        :aria-label="datePickerAriaLabel"
        :empty-label="emptyLabel"
        :test-id="datePickerTestId"
      >
        <label class="pr-time-window-editor__field">
          <span class="pr-time-window-editor__field-label">
            {{ datePickerAriaLabel }}
          </span>
          <select
            class="pr-time-window-editor__select"
            :value="datePickerModelValue ?? ''"
            :data-testid="datePickerTestId"
            @change="handleNativeDateChange"
          >
            <option v-if="datePickerOptions.length === 0" value="">
              {{ emptyLabel }}
            </option>
            <option
              v-for="option in datePickerOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
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
        <label class="pr-time-window-editor__field">
          <span class="pr-time-window-editor__field-label">
            {{ timePickerAriaLabel }}
          </span>
          <select
            class="pr-time-window-editor__select"
            :value="timePickerModelValue ?? ''"
            :data-testid="timePickerTestId"
            @change="handleNativeTimeChange"
          >
            <option v-if="timePickerOptions.length === 0" value="">
              {{ emptyLabel }}
            </option>
            <option
              v-for="option in timePickerOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </slot>
    </div>

    <label v-if="showDurationInput" class="pr-time-window-editor__duration-field">
      <span class="pr-time-window-editor__duration-label">
        {{ durationMinutesLabel }}
      </span>
      <input
        v-model.number="customDurationMinutes"
        class="pr-time-window-editor__select pr-time-window-editor__duration-input"
        type="number"
        min="5"
        step="5"
        inputmode="numeric"
        :data-testid="durationInputTestId"
      />
    </label>

    <p v-if="selectedDescription" class="pr-time-window-editor__hint">
      {{ selectedDescription }}
    </p>
    <p v-else-if="fixedDurationLabel" class="pr-time-window-editor__hint">
      {{ fixedDurationLabel }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import MultiStopToggle, {
  type MultiStopToggleOption,
} from "@/shared/ui/forms/MultiStopToggle.vue";
import {
  buildAdvancedModeStartOptions,
  buildFormModeDateKey,
  buildFormModeFuzzyDateOptions,
  buildFormModeFuzzyTimeOptions,
  buildFormModeFuzzyTimeWindows,
  buildStartOptionsByDate,
  formatFormModeDurationLabel,
  formatFormModeTimeLabel,
  type FormModeFuzzyTimePreset,
} from "@/domains/event/model/form-mode";
import type { TimeWindow } from "@/domains/event/model/time-window-view";
import {
  buildAllowEditAfterReadyForTimeWindowMode,
  findFuzzyPresetForTimeWindow,
  timeWindowsEqual,
  type PRTimeWindowEditorMode,
  type PRTimeWindowPickerOption,
  type PRTimeWindowPresetOption,
} from "@/domains/event/model/pr-time-window-editor";

type TimeModeOption = MultiStopToggleOption & {
  value: PRTimeWindowEditorMode;
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
    defaultMode?: PRTimeWindowEditorMode;
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
    testIdPrefix: "pr-time-window-editor",
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

const activeMode = ref<PRTimeWindowEditorMode>(props.defaultMode);
const selectedDateKey = ref<string | null>(null);
const selectedTimeValue = ref<string | null>(null);
const selectedFuzzyDateValue = ref<string | null>(null);
const selectedFuzzyTimePreset = ref<FormModeFuzzyTimePreset | null>(null);
const customDurationMinutes = ref(DEFAULT_CUSTOM_DURATION_MINUTES);

const modeToggleTestId = computed(
  () => props.modeToggleTestId ?? `${props.testIdPrefix}.mode-toggle`,
);
const datePickerTestId = computed(
  () => props.datePickerTestId ?? `${props.testIdPrefix}.date`,
);
const timePickerTestId = computed(
  () => props.timePickerTestId ?? `${props.testIdPrefix}.time`,
);
const durationInputTestId = computed(
  () => props.durationInputTestId ?? `${props.testIdPrefix}.duration`,
);

const normalGroups = computed(() => buildStartOptionsByDate(props.presetOptions));
const advancedOptions = computed(() =>
  buildAdvancedModeStartOptions(props.earliestLeadMinutes),
);
const advancedGroups = computed(() =>
  buildStartOptionsByDate(advancedOptions.value),
);
const fuzzyDateOptions = computed(() => buildFormModeFuzzyDateOptions());
const fuzzyTimeOptions = computed(() => buildFormModeFuzzyTimeOptions());

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

  const group = activeGroups.value.find(
    (item) => item.dateKey === selectedDateKey.value,
  );
  return (group?.options ?? []).map((option) => ({
    label: formatFormModeTimeLabel(option.startAt),
    value: activeMode.value === "NORMAL" ? option.key : option.startAt,
  }));
});

const datePickerOptions = computed(() => activeDateOptions.value);
const timePickerOptions = computed(() => activeTimeOptions.value);

const datePickerModelValue = computed(() =>
  activeMode.value === "FUZZY"
    ? selectedFuzzyDateValue.value
    : selectedDateKey.value,
);
const timePickerModelValue = computed(() =>
  activeMode.value === "FUZZY"
    ? selectedFuzzyTimePreset.value
    : selectedTimeValue.value,
);

const activeModeLabel = computed(
  () =>
    timeModeOptions.find((option) => option.value === activeMode.value)
      ?.label ?? "",
);

const selectedNormalOption = computed(() =>
  props.presetOptions.find((option) => option.key === selectedTimeValue.value) ??
  null,
);

const fixedDurationLabel = computed(() =>
  activeMode.value === "ADVANCED" && props.durationMinutes !== null
    ? formatFormModeDurationLabel(props.durationMinutes)
    : "",
);

const showDurationInput = computed(
  () => activeMode.value === "ADVANCED" && props.durationMinutes === null,
);

const selectedDescription = computed(() =>
  activeMode.value === "NORMAL"
    ? (selectedNormalOption.value?.description?.trim() ?? "")
    : "",
);

const resolveAdvancedEndAt = (startAt: string): string | null => {
  const durationMinutes = props.durationMinutes ?? customDurationMinutes.value;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return null;
  }

  return new Date(
    new Date(startAt).getTime() + durationMinutes * MINUTE_MS,
  ).toISOString();
};

const resolveSelectedTimeWindow = (): TimeWindow | null => {
  if (activeMode.value === "FUZZY") {
    if (!selectedFuzzyDateValue.value || !selectedFuzzyTimePreset.value) {
      return null;
    }
    const [timeWindow] = buildFormModeFuzzyTimeWindows(
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

  const policy = buildAllowEditAfterReadyForTimeWindowMode(
    activeMode.value,
    timeWindow,
  );
  if (
    JSON.stringify(policy) !== JSON.stringify(props.allowEditAfterReady ?? null)
  ) {
    emit("update:allowEditAfterReady", policy);
  }
};

const setModeForExternalValue = (timeWindow: TimeWindow | null) => {
  if (timeWindow === null) {
    return;
  }

  const allowEditWindow = props.allowEditAfterReady?.timeWindow ?? null;
  if (
    allowEditWindow &&
    timeWindowsEqual(timeWindow, [allowEditWindow[0], allowEditWindow[1]])
  ) {
    const fuzzyPreset = findFuzzyPresetForTimeWindow(timeWindow);
    activeMode.value = "FUZZY";
    selectedFuzzyDateValue.value =
      fuzzyPreset?.dateValue ?? buildFormModeDateKey(timeWindow[0] ?? "");
    selectedFuzzyTimePreset.value = fuzzyPreset?.timePreset ?? "ALL_DAY";
    return;
  }

  const preset = props.presetOptions.find((option) =>
    timeWindowsEqual([option.startAt, option.endAt], timeWindow),
  );
  if (preset) {
    activeMode.value = "NORMAL";
    selectedDateKey.value = buildFormModeDateKey(preset.startAt);
    selectedTimeValue.value = preset.key;
    return;
  }

  if (timeWindow[0]) {
    activeMode.value = "ADVANCED";
    selectedDateKey.value = buildFormModeDateKey(timeWindow[0]);
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
    selectedFuzzyTimePreset.value = nextValue as FormModeFuzzyTimePreset | null;
    return;
  }
  selectedTimeValue.value = nextValue;
};

const handleNativeDateChange = (event: Event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement) {
    handleDatePickerUpdate(target.value || null);
  }
};

const handleNativeTimeChange = (event: Event) => {
  const target = event.target;
  if (target instanceof HTMLSelectElement) {
    handleTimePickerUpdate(target.value || null);
  }
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
        !fuzzyDateOptions.value.some(
          (option) => option.value === selectedFuzzyDateValue.value,
        )
      ) {
        selectedFuzzyDateValue.value = fuzzyDateOptions.value[0]?.value ?? null;
      }
      if (
        selectedFuzzyTimePreset.value === null ||
        !fuzzyTimeOptions.value.some(
          (option) => option.value === selectedFuzzyTimePreset.value,
        )
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
      activeTimeOptions.value.some(
        (option) => option.value === selectedTimeValue.value,
      )
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
.pr-time-window-editor {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.pr-time-window-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.pr-time-window-editor__label {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(caption);
}

.pr-time-window-editor__mode-switcher {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
}

.pr-time-window-editor__mode-label {
  color: var(--sys-color-on-surface-variant);
  white-space: nowrap;
  @include mx.pu-font(caption);
}

.pr-time-window-editor__pickers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-xsmall);
}

.pr-time-window-editor__field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.pr-time-window-editor__duration-field {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.pr-time-window-editor__field-label,
.pr-time-window-editor__duration-label {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(caption);
}

.pr-time-window-editor__select {
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

.pr-time-window-editor__duration-input {
  flex: 0 0 min(8rem, 45%);
  width: auto;
  text-align: end;
}

.pr-time-window-editor__hint {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(support);
}
</style>
