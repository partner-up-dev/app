<template>
  <section
    class="time-window-inline-editor"
    data-testid="anchor-event-assisted-pr-time-window-inline-editor"
  >
    <p
      v-if="detailQuery.isLoading.value"
      class="time-window-inline-editor__hint"
    >
      {{ t("common.loading") }}
    </p>
    <p
      v-else-if="detailQuery.isError.value"
      class="time-window-inline-editor__message"
    >
      {{ t("anchorEvent.loadFailed") }}
    </p>

    <label
      v-else-if="presetOptions.length > 0"
      class="time-window-inline-editor__field"
    >
      <span class="time-window-inline-editor__label">
        {{ t("anchorEvent.createCard.timeWindowLabel") }}
      </span>
      <select
        class="time-window-inline-editor__input"
        :value="selectedPresetKey ?? ''"
        @change="handlePresetChange"
      >
        <option
          v-for="option in presetOptions"
          :key="option.key"
          :value="option.key"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <div v-else class="time-window-inline-editor__custom">
      <label
        class="time-window-inline-editor__field time-window-inline-editor__field--start"
        :class="{
          'time-window-inline-editor__field--full': !isDurationEditable,
        }"
      >
        <span class="time-window-inline-editor__label">
          {{ t("anchorEvent.createCard.customStartLabel") }}
        </span>
        <input
          v-model="customStartInput"
          class="time-window-inline-editor__input"
          type="datetime-local"
          :min="customStartMin"
          :max="customStartMax ?? undefined"
        />
      </label>

      <label
        v-if="isDurationEditable"
        class="time-window-inline-editor__field time-window-inline-editor__field--duration"
      >
        <span class="time-window-inline-editor__label">
          {{ t("anchorEvent.createCard.durationMinutesLabel") }}
        </span>
        <input
          v-model.number="customDurationMinutes"
          class="time-window-inline-editor__input"
          type="number"
          min="5"
          step="5"
          inputmode="numeric"
        />
      </label>

      <p v-if="customValidationMessage" class="time-window-inline-editor__message">
        {{ customValidationMessage }}
      </p>
      <p
        v-else-if="fixedDurationLabel"
        class="time-window-inline-editor__hint"
      >
        {{ fixedDurationLabel }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import {
  formatTimeWindowOptionLabel,
  hasTimeWindowStarted,
  type TimeWindow,
} from "@/domains/event/model/time-window-view";
import {
  buildFormModeStartAtFromRouteParts,
  formatFormModeDurationLabel,
} from "@/domains/event/model/form-mode";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";

type CreateTimeWindowEntry =
  AnchorEventDetailResponse["createTimeWindows"][number];

const MINUTE_MS = 60 * 1000;
const FIVE_MINUTES_MS = 5 * MINUTE_MS;
const DEFAULT_CUSTOM_DURATION_MINUTES = 60;

const props = defineProps<{
  anchorEventId: number;
  modelValue: TimeWindow | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TimeWindow | null];
}>();

const { t } = useI18n();
const eventId = computed<number | null>(() => props.anchorEventId);
const detailQuery = useAnchorEventDetail(eventId);
const detail = computed(() => detailQuery.data.value ?? null);

const selectedPresetKey = ref<string | null>(null);
const customStartInput = ref("");
const customDurationMinutes = ref<number>(DEFAULT_CUSTOM_DURATION_MINUTES);

const toDateTimeLocalInput = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get("year") ?? "1970";
  const month = byType.get("month") ?? "01";
  const day = byType.get("day") ?? "01";
  const hour = byType.get("hour") ?? "00";
  const minute = byType.get("minute") ?? "00";
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const roundUpToNextFiveMinutes = (date: Date): Date => {
  const rounded = Math.ceil(date.getTime() / FIVE_MINUTES_MS) * FIVE_MINUTES_MS;
  const resolved = new Date(rounded);
  if (resolved.getTime() <= date.getTime()) {
    return new Date(resolved.getTime() + FIVE_MINUTES_MS);
  }
  return resolved;
};

const parseDateTimeLocalInput = (value: string): string | null => {
  const normalized = value.trim();
  const [dateKey, timeKey] = normalized.split("T");
  if (!dateKey || !timeKey) {
    return null;
  }
  return buildFormModeStartAtFromRouteParts(dateKey, timeKey);
};

const timeWindowsEqual = (
  left: TimeWindow | null | undefined,
  right: TimeWindow | null | undefined,
): boolean =>
  (left?.[0] ?? null) === (right?.[0] ?? null) &&
  (left?.[1] ?? null) === (right?.[1] ?? null);

const presetEntries = computed<CreateTimeWindowEntry[]>(() =>
  [...(detail.value?.createTimeWindows ?? [])]
    .filter((entry) => !hasTimeWindowStarted(entry.timeWindow))
    .sort((left, right) =>
      (left.timeWindow[0] ?? "").localeCompare(right.timeWindow[0] ?? ""),
    ),
);

const presetOptions = computed(() =>
  presetEntries.value.map((entry, index) => ({
    key: entry.key,
    label: formatTimeWindowOptionLabel(
      entry.timeWindow,
      index,
      t("anchorEvent.batchLabel"),
      entry.description,
    ),
  })),
);

const selectedPresetEntry = computed(() => {
  const key = selectedPresetKey.value;
  if (key === null) {
    return null;
  }
  return presetEntries.value.find((entry) => entry.key === key) ?? null;
});

const fixedDurationMinutes = computed(
  () => detail.value?.durationMinutes ?? null,
);
const earliestLeadMinutes = computed(
  () => detail.value?.earliestLeadMinutes ?? null,
);
const isDurationEditable = computed(() => fixedDurationMinutes.value === null);
const resolvedDurationMinutes = computed(() =>
  fixedDurationMinutes.value ?? customDurationMinutes.value,
);

const customStartMin = computed(() =>
  toDateTimeLocalInput(roundUpToNextFiveMinutes(new Date())),
);

const customStartMax = computed(() => {
  const leadMinutes = earliestLeadMinutes.value;
  if (leadMinutes === null || leadMinutes <= 0) {
    return null;
  }
  const latestStart = new Date(Date.now() + leadMinutes * MINUTE_MS);
  return toDateTimeLocalInput(latestStart);
});

const selectedCustomStartIso = computed(() =>
  parseDateTimeLocalInput(customStartInput.value),
);

const resolvedCustomEndIso = computed(() => {
  const startAt = selectedCustomStartIso.value;
  const durationMinutes = resolvedDurationMinutes.value;
  if (
    startAt === null ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return null;
  }

  return new Date(
    new Date(startAt).getTime() + durationMinutes * MINUTE_MS,
  ).toISOString();
});

const customValidationMessage = computed(() => {
  const startAt = selectedCustomStartIso.value;
  const endAt = resolvedCustomEndIso.value;
  if (startAt === null) {
    return t("anchorEvent.createCard.errors.missingTimeWindow");
  }
  if (endAt === null) {
    return t("anchorEvent.createCard.errors.missingDuration");
  }

  const startTimestamp = new Date(startAt).getTime();
  const endTimestamp = new Date(endAt).getTime();
  if (
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp) ||
    startTimestamp <= Date.now()
  ) {
    return t("anchorEvent.createCard.errors.timeWindowAlreadyPassed");
  }

  const leadMinutes = earliestLeadMinutes.value;
  if (
    leadMinutes !== null &&
    leadMinutes > 0 &&
    startTimestamp > Date.now() + leadMinutes * MINUTE_MS
  ) {
    return t("anchorEvent.createCard.errors.timeWindowOutsideLead");
  }

  return null;
});

const customTimeWindow = computed<TimeWindow>(() => [
  selectedCustomStartIso.value,
  customValidationMessage.value === null ? resolvedCustomEndIso.value : null,
]);

const fixedDurationLabel = computed(() => {
  if (fixedDurationMinutes.value === null) {
    return "";
  }
  return formatFormModeDurationLabel(fixedDurationMinutes.value);
});

const handlePresetChange = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }
  selectedPresetKey.value = target.value.trim() || null;
};

watch(
  () => props.modelValue,
  (timeWindow) => {
    if (timeWindow === null) {
      return;
    }

    const matchedPreset = presetEntries.value.find((entry) =>
      timeWindowsEqual(entry.timeWindow, timeWindow),
    );
    if (matchedPreset) {
      selectedPresetKey.value = matchedPreset.key;
      return;
    }

    if (timeWindow[0]) {
      customStartInput.value = toDateTimeLocalInput(new Date(timeWindow[0]));
    }
  },
  { immediate: true },
);

watch(
  presetEntries,
  (entries) => {
    if (detail.value === null) {
      return;
    }

    if (entries.length === 0) {
      selectedPresetKey.value = null;
      if (!customStartInput.value) {
        customStartInput.value = customStartMin.value;
      }
      return;
    }

    if (
      selectedPresetKey.value !== null &&
      entries.some((entry) => entry.key === selectedPresetKey.value)
    ) {
      return;
    }

    const matchedModel = entries.find((entry) =>
      timeWindowsEqual(entry.timeWindow, props.modelValue),
    );
    selectedPresetKey.value = matchedModel?.key ?? entries[0]?.key ?? null;
  },
  { immediate: true },
);

watch(
  [selectedPresetEntry, customTimeWindow, presetEntries],
  ([presetEntry, customValue, entries]) => {
    if (detail.value === null) {
      return;
    }

    const nextValue = entries.length > 0 ? (presetEntry?.timeWindow ?? null) : customValue;
    if (!timeWindowsEqual(nextValue, props.modelValue)) {
      emit("update:modelValue", nextValue);
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.time-window-inline-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.time-window-inline-editor__custom {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(5.75rem, 3fr);
  gap: var(--sys-spacing-small);
  align-items: start;
}

.time-window-inline-editor__field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.time-window-inline-editor__field--full {
  grid-column: 1 / -1;
}

.time-window-inline-editor__label {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.time-window-inline-editor__input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: var(--sys-size-large);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.time-window-inline-editor__message,
.time-window-inline-editor__hint {
  grid-column: 1 / -1;
  margin: 0;
  @include mx.pu-font(body-small);
}

.time-window-inline-editor__message {
  color: var(--sys-color-error);
}

.time-window-inline-editor__hint {
  color: var(--sys-color-on-surface-variant);
}

</style>
