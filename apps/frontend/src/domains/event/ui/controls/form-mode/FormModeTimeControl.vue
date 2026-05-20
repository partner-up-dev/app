<template>
  <section class="form-mode-time-control">
    <div class="form-mode-time-control__header">
      <div class="form-mode-time-control__title-row">
        <h2 class="form-mode-time-control__title">
          {{ t("anchorEvent.formMode.timeTitle") }}
        </h2>

        <MultiStopToggle
          v-model="activeMode"
          :options="timeModeOptions"
          :aria-label="t('anchorEvent.formMode.timeModeToggleAriaLabel')"
          size="sm"
          data-testid="anchor-event-form-mode.time-mode-toggle"
        />
      </div>

      <p class="form-mode-time-control__duration">
        {{ durationLabel }}
      </p>
    </div>

    <div class="time-wheel">
      <WheelPicker
        :model-value="dateWheelModelValue"
        :options="dateWheelOptions"
        :item-height="42"
        :visible-count="3"
        :aria-label="t('anchorEvent.formMode.dateWheelAriaLabel')"
        :empty-label="t('anchorEvent.formMode.timePlaceholder')"
        data-testid="anchor-event-form-mode.time-date-wheel"
        @update:model-value="handleDateWheelUpdate"
      />

      <WheelPicker
        :model-value="timeWheelModelValue"
        :options="timeWheelOptions"
        :item-height="42"
        :visible-count="3"
        :aria-label="t('anchorEvent.formMode.timeWheelAriaLabel')"
        :empty-label="t('anchorEvent.formMode.timePlaceholder')"
        data-testid="anchor-event-form-mode.time-time-wheel"
        @update:model-value="handleTimeWheelUpdate"
      />
    </div>

    <p
      v-if="selectedStartOptionDescription"
      class="form-mode-time-control__description"
    >
      {{ selectedStartOptionDescription }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import WheelPicker, {
  type WheelPickerValue,
} from "@/shared/ui/forms/WheelPicker.vue";
import MultiStopToggle, {
  type MultiStopToggleOption,
} from "@/shared/ui/forms/MultiStopToggle.vue";
import {
  buildAdvancedModeStartOptions,
  buildFormModeCreateTimeWindow,
  buildFormModeFuzzyDateOptions,
  buildFormModeFuzzyTimeWindows,
  buildFormModeFuzzyTimeOptions,
  buildFormModeDateKey,
  buildFormModePointTimeWindows,
  buildStartOptionsByDate,
  formatFormModeFuzzySelectionLabel,
  formatFormModeDurationLabel,
  formatFormModeDateLabel,
  formatFormModeTimeLabel,
  type FormModeFuzzyTimePreset,
  type FormModeTimeMode,
  type FormModeTimeSelection,
  isValidFormModeDateTime,
  shouldAutoOpenAdvancedFormModeTime,
} from "@/domains/event/model/form-mode";

type StartOption = AnchorEventFormModeResponse["startOptions"][number];
type StartOptionGroup = ReturnType<typeof buildStartOptionsByDate>[number];

const props = defineProps<{
  modelValue: FormModeTimeSelection | null;
  startOptions: readonly StartOption[];
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: FormModeTimeSelection | null];
}>();

const { t } = useI18n();

const timeModeOptions: readonly MultiStopToggleOption[] = [
  { value: "NORMAL", label: "普通" },
  { value: "ADVANCED", label: "高级" },
  { value: "FUZZY", label: "模糊" },
];
const selectedDateKey = ref<string | null>(null);
const activeMode = ref<FormModeTimeMode>("NORMAL");
const selectedFuzzyDateValue = ref<string | null>(null);
const selectedFuzzyTimePreset = ref<FormModeFuzzyTimePreset | null>(null);

const defaultStartOptionGroups = computed(() =>
  buildStartOptionsByDate(props.startOptions),
);

const advancedStartOptionGroups = computed(() =>
  buildStartOptionsByDate(
    buildAdvancedModeStartOptions(props.earliestLeadMinutes),
  ),
);

const shouldAutoOpenAdvancedMode = computed(() =>
  shouldAutoOpenAdvancedFormModeTime(
    props.startOptions,
    props.earliestLeadMinutes,
  ),
);

const activeStartOptionGroups = computed(() =>
  activeMode.value === "ADVANCED"
    ? advancedStartOptionGroups.value
    : defaultStartOptionGroups.value,
);

const activeTimeOptions = computed<StartOption[]>(() => {
  const group = activeStartOptionGroups.value.find(
    (item) => item.dateKey === selectedDateKey.value,
  );
  return (group?.options ?? []) as StartOption[];
});

const dateWheelOptions = computed(() =>
  activeMode.value === "FUZZY"
    ? fuzzyDateOptions.value.map((option) => ({
        label: option.label,
        value: option.value,
      }))
    : activeStartOptionGroups.value.map((group) => ({
        label: group.dateLabel,
        value: group.dateKey,
      })),
);

const timeWheelOptions = computed(() =>
  activeMode.value === "FUZZY"
    ? fuzzyTimeOptions.value.map((option) => ({
        label: option.label,
        value: option.value,
      }))
    : activeTimeOptions.value.map((option) => ({
        label: formatFormModeTimeLabel(option.startAt),
        value: option.startAt,
      })),
);

const fuzzyDateOptions = computed(() =>
  buildFormModeFuzzyDateOptions(),
);

const fuzzyTimeOptions = computed(() => buildFormModeFuzzyTimeOptions());

const exactModelStartAt = computed(() =>
  props.modelValue?.mode !== "FUZZY"
    ? props.modelValue?.createTimeWindow?.startAt ?? null
    : null,
);

const dateWheelModelValue = computed(() =>
  activeMode.value === "FUZZY"
    ? selectedFuzzyDateValue.value
    : selectedDateKey.value,
);

const timeWheelModelValue = computed(() =>
  activeMode.value === "FUZZY"
    ? selectedFuzzyTimePreset.value
    : exactModelStartAt.value,
);

const durationLabel = computed(() =>
  formatFormModeDurationLabel(props.durationMinutes),
);

const selectedStartOptionDescription = computed(() => {
  if (!exactModelStartAt.value) {
    return "";
  }

  const option = props.startOptions.find(
    (startOption) => startOption.startAt === exactModelStartAt.value,
  );
  return option?.description?.trim() ?? "";
});

const handleDateWheelUpdate = (value: WheelPickerValue) => {
  if (activeMode.value === "FUZZY") {
    selectedFuzzyDateValue.value = String(value);
    return;
  }
  selectedDateKey.value = String(value);
};

const handleTimeWheelUpdate = (value: WheelPickerValue) => {
  if (activeMode.value === "FUZZY") {
    selectedFuzzyTimePreset.value = String(value) as FormModeFuzzyTimePreset;
    emitFuzzySelection();
    return;
  }

  const nextValue = String(value);
  emitExactSelection(nextValue);
};

const emitExactSelection = (startAt: string | null) => {
  if (!startAt || !isValidFormModeDateTime(startAt)) {
    emit("update:modelValue", null);
    return;
  }
  const sourceMode = activeMode.value === "ADVANCED" ? "ADVANCED" : "NORMAL";
  const matchingPreset = props.startOptions.find(
    (option) => option.startAt === startAt,
  );
  const createTimeWindow =
    sourceMode === "NORMAL" && matchingPreset
      ? {
          startAt: matchingPreset.startAt,
          endAt: matchingPreset.endAt,
        }
      : buildFormModeCreateTimeWindow(startAt, props.durationMinutes);

  emit("update:modelValue", {
    mode: sourceMode,
    label: `${formatFormModeDateLabel(startAt)} ${formatFormModeTimeLabel(startAt)}`,
    timeWindows: buildFormModePointTimeWindows(startAt),
    createTimeWindow,
  });
};

const emitFuzzySelection = () => {
  if (!selectedFuzzyDateValue.value || !selectedFuzzyTimePreset.value) {
    emit("update:modelValue", null);
    return;
  }
  const timeWindows = buildFormModeFuzzyTimeWindows(
    selectedFuzzyDateValue.value,
    selectedFuzzyTimePreset.value,
  );
  const fallbackStartAt = timeWindows[0]?.startAt ?? null;
  emit("update:modelValue", {
    mode: "FUZZY",
    label: formatFormModeFuzzySelectionLabel(
      selectedFuzzyDateValue.value,
      selectedFuzzyTimePreset.value,
    ),
    timeWindows,
    createTimeWindow:
      fallbackStartAt === null
        ? null
        : buildFormModeCreateTimeWindow(fallbackStartAt, props.durationMinutes),
  });
};

const findGroupForStartAt = (
  groups: readonly StartOptionGroup[],
  startAt: string,
): StartOptionGroup | null =>
  groups.find((group) =>
    group.options.some((option) => option.startAt === startAt),
  ) ?? null;

const resolveDateKey = (value: string): string | null => {
  if (!isValidFormModeDateTime(value)) {
    return null;
  }
  return buildFormModeDateKey(value);
};

watch(
  shouldAutoOpenAdvancedMode,
  (shouldOpen) => {
    if (shouldOpen && activeMode.value === "NORMAL") {
      activeMode.value = "ADVANCED";
    }
  },
  { immediate: true },
);

watch(
  [() => props.modelValue, defaultStartOptionGroups, advancedStartOptionGroups],
  ([modelValue, defaultGroups, advancedGroups]) => {
    if (!modelValue) {
      return;
    }
    activeMode.value = modelValue.mode;
    if (modelValue.mode === "FUZZY") {
      return;
    }

    const modelStartAt = modelValue.createTimeWindow?.startAt ?? null;
    if (!isValidFormModeDateTime(modelStartAt)) {
      emit("update:modelValue", null);
      return;
    }

    const activeGroup = findGroupForStartAt(
      activeStartOptionGroups.value,
      modelStartAt,
    );
    if (activeGroup) {
      selectedDateKey.value = activeGroup.dateKey;
      return;
    }

    const defaultGroup = findGroupForStartAt(defaultGroups, modelStartAt);
    if (defaultGroup) {
      activeMode.value = "NORMAL";
      selectedDateKey.value = defaultGroup.dateKey;
      return;
    }

    const advancedGroup = findGroupForStartAt(advancedGroups, modelStartAt);
    if (advancedGroup) {
      activeMode.value = "ADVANCED";
      selectedDateKey.value = advancedGroup.dateKey;
      return;
    }

    const modelDateKey = resolveDateKey(modelStartAt);
    const advancedDateGroup =
      modelDateKey === null
        ? null
        : (advancedGroups.find((group) => group.dateKey === modelDateKey) ??
          null);
    if (advancedDateGroup) {
      activeMode.value = "ADVANCED";
      selectedDateKey.value = advancedDateGroup.dateKey;
    }
  },
  { immediate: true },
);

watch(
  activeStartOptionGroups,
  (groups) => {
    if (activeMode.value === "FUZZY") {
      return;
    }
    if (
      selectedDateKey.value &&
      groups.some((group) => group.dateKey === selectedDateKey.value)
    ) {
      return;
    }
    selectedDateKey.value = groups[0]?.dateKey ?? null;
  },
  { immediate: true },
);

watch(
  [activeTimeOptions, selectedDateKey],
  ([options]) => {
    if (activeMode.value === "FUZZY") {
      return;
    }
    if (
      exactModelStartAt.value &&
      options.some((option) => option.startAt === exactModelStartAt.value)
    ) {
      return;
    }
    emitExactSelection(options[0]?.startAt ?? null);
  },
  { immediate: true },
);

watch(
  fuzzyDateOptions,
  (options) => {
    if (
      selectedFuzzyDateValue.value &&
      options.some((option) => option.value === selectedFuzzyDateValue.value)
    ) {
      return;
    }
    selectedFuzzyDateValue.value = options[0]?.value ?? null;
  },
  { immediate: true },
);

watch(
  fuzzyTimeOptions,
  (options) => {
    if (
      selectedFuzzyTimePreset.value &&
      options.some((option) => option.value === selectedFuzzyTimePreset.value)
    ) {
      return;
    }
    selectedFuzzyTimePreset.value = options[0]?.value ?? null;
  },
  { immediate: true },
);

watch(
  [activeMode, selectedFuzzyDateValue, selectedFuzzyTimePreset],
  () => {
    if (activeMode.value === "FUZZY") {
      emitFuzzySelection();
      return;
    }
    emitExactSelection(activeTimeOptions.value[0]?.startAt ?? exactModelStartAt.value);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.form-mode-time-control {
  display: flex;
  flex-direction: column;
}

.form-mode-time-control__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);
  color: var(--sys-color-on-surface-variant);
}

.form-mode-time-control__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: nowrap;
}

.form-mode-time-control__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--sys-color-on-surface);
  @include mx.pu-font(title-medium);
}

.form-mode-time-control__duration {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(label-large);
}

.time-wheel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-xsmall);
}

.form-mode-time-control__description {
  margin: var(--sys-spacing-xsmall) 0 0;
  color: var(--sys-color-secondary);
  text-align: center;
  @include mx.pu-font(label-large);
}

@media (max-width: 720px) {
  .form-mode-time-control__title-row {
    gap: var(--sys-spacing-xsmall);
  }
}
</style>
