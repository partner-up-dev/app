<template>
  <section class="form-mode-time-control">
    <div class="form-mode-time-control__header">
      <div class="form-mode-time-control__title-row">
        <h2 class="form-mode-time-control__title">
          {{ t("anchorEvent.formMode.timeTitle") }}
        </h2>

        <ToggleSwitch
          v-model="advancedMode"
          :label="t('anchorEvent.formMode.advancedModeLabel')"
        />
      </div>

      <p class="form-mode-time-control__duration">
        {{ durationLabel }}
      </p>
    </div>

    <div class="time-wheel">
      <WheelPicker
        :model-value="selectedDateKey"
        :options="dateWheelOptions"
        :item-height="42"
        :visible-count="3"
        :aria-label="t('anchorEvent.formMode.dateWheelAriaLabel')"
        :empty-label="t('anchorEvent.formMode.timePlaceholder')"
        @update:model-value="handleDateWheelUpdate"
      />

      <WheelPicker
        :model-value="props.modelValue"
        :options="timeWheelOptions"
        :item-height="42"
        :visible-count="3"
        :aria-label="t('anchorEvent.formMode.timeWheelAriaLabel')"
        :empty-label="t('anchorEvent.formMode.timePlaceholder')"
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
import ToggleSwitch from "@/shared/ui/forms/ToggleSwitch.vue";
import {
  buildAdvancedModeStartOptions,
  buildFormModeDateKey,
  buildStartOptionsByDate,
  formatFormModeDurationLabel,
  formatFormModeTimeLabel,
  isValidFormModeDateTime,
  shouldAutoOpenAdvancedFormModeTime,
} from "@/domains/event/model/form-mode";

type StartOption = AnchorEventFormModeResponse["startOptions"][number];
type StartOptionGroup = ReturnType<typeof buildStartOptionsByDate>[number];

const props = defineProps<{
  modelValue: string | null;
  startOptions: readonly StartOption[];
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { t } = useI18n();

const selectedDateKey = ref<string | null>(null);
const advancedMode = ref(false);

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
  advancedMode.value
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
  activeStartOptionGroups.value.map((group) => ({
    label: group.dateLabel,
    value: group.dateKey,
  })),
);

const timeWheelOptions = computed(() =>
  activeTimeOptions.value.map((option) => ({
    label: formatFormModeTimeLabel(option.startAt),
    value: option.startAt,
  })),
);

const durationLabel = computed(() =>
  formatFormModeDurationLabel(props.durationMinutes),
);

const selectedStartOptionDescription = computed(() => {
  if (!props.modelValue) {
    return "";
  }

  const option = props.startOptions.find(
    (startOption) => startOption.startAt === props.modelValue,
  );
  return option?.description?.trim() ?? "";
});

const handleDateWheelUpdate = (value: WheelPickerValue) => {
  selectedDateKey.value = String(value);
};

const handleTimeWheelUpdate = (value: WheelPickerValue) => {
  const nextValue = String(value);
  emit(
    "update:modelValue",
    isValidFormModeDateTime(nextValue) ? nextValue : null,
  );
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
    if (shouldOpen) {
      advancedMode.value = true;
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
    if (!isValidFormModeDateTime(modelValue)) {
      emit("update:modelValue", null);
      return;
    }

    const activeGroup = findGroupForStartAt(
      activeStartOptionGroups.value,
      modelValue,
    );
    if (activeGroup) {
      selectedDateKey.value = activeGroup.dateKey;
      return;
    }

    const defaultGroup = findGroupForStartAt(defaultGroups, modelValue);
    if (defaultGroup) {
      advancedMode.value = false;
      selectedDateKey.value = defaultGroup.dateKey;
      return;
    }

    const advancedGroup = findGroupForStartAt(advancedGroups, modelValue);
    if (advancedGroup) {
      advancedMode.value = true;
      selectedDateKey.value = advancedGroup.dateKey;
      return;
    }

    const modelDateKey = resolveDateKey(modelValue);
    const advancedDateGroup =
      modelDateKey === null
        ? null
        : (advancedGroups.find((group) => group.dateKey === modelDateKey) ??
          null);
    if (advancedDateGroup) {
      advancedMode.value = true;
      selectedDateKey.value = advancedDateGroup.dateKey;
    }
  },
  { immediate: true },
);

watch(
  activeStartOptionGroups,
  (groups) => {
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
    if (
      props.modelValue &&
      options.some((option) => option.startAt === props.modelValue)
    ) {
      return;
    }
    emit("update:modelValue", options[0]?.startAt ?? null);
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
