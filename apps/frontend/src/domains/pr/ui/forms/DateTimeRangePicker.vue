<template>
  <div class="form-field">
    <label>{{ labelText }}</label>
    <div class="time-range">
      <div class="time-block">
        <div class="time-inputs">
          <input
            v-model="startDate"
            type="date"
            :data-testid="`${testIdPrefix}.start-date`"
            :placeholder="t('dateTimeRangePicker.startDatePlaceholder')"
          />
          <input
            v-model="startTime"
            type="time"
            :data-testid="`${testIdPrefix}.start-time`"
            :placeholder="t('dateTimeRangePicker.startTimePlaceholder')"
            :disabled="!startDate"
          />
        </div>
        <div class="time-actions">
          <PuButton

            class="clear-time"
            tone="neutral" variant="outline"
            size="sm"
            :disabled="!startTime"
            @click="clearStartTime"
          >
            {{ t("dateTimeRangePicker.clearTime") }}
          </PuButton>
          <PuButton

            class="clear-time"
            tone="neutral" variant="outline"
            size="sm"
            :disabled="!startDate && !startTime"
            @click="clearStart"
          >
            {{ t("dateTimeRangePicker.clear") }}
          </PuButton>
        </div>
      </div>
      <div class="time-block">
        <div class="time-inputs">
          <input
            v-model="endDate"
            type="date"
            :data-testid="`${testIdPrefix}.end-date`"
            :placeholder="t('dateTimeRangePicker.endDatePlaceholder')"
          />
          <input
            v-model="endTime"
            type="time"
            :data-testid="`${testIdPrefix}.end-time`"
            :placeholder="t('dateTimeRangePicker.endTimePlaceholder')"
            :disabled="!endDate"
          />
        </div>
        <div class="time-actions">
          <PuButton

            class="clear-time"
            tone="neutral" variant="outline"
            size="sm"
            :disabled="!endTime"
            @click="clearEndTime"
          >
            {{ t("dateTimeRangePicker.clearTime") }}
          </PuButton>
          <PuButton

            class="clear-time"
            tone="neutral" variant="outline"
            size="sm"
            :disabled="!endDate && !endTime"
            @click="clearEnd"
          >
            {{ t("dateTimeRangePicker.clear") }}
          </PuButton>
        </div>
      </div>
    </div>
    <p class="time-hint">{{ hintText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import { PuButton } from "@partner-up-dev/design-web";

type TimeWindow = PartnerRequestFields["time"];

interface Props {
  modelValue: TimeWindow;
  label?: string;
  hint?: string;
  testIdPrefix?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  hint: undefined,
  testIdPrefix: "pr-editor.form",
});

const { t } = useI18n();
const testIdPrefix = computed(() => props.testIdPrefix);

const labelText = computed(
  () => props.label ?? t("dateTimeRangePicker.defaultLabel"),
);

const hintText = computed(
  () => props.hint ?? t("dateTimeRangePicker.defaultHint"),
);

const emit = defineEmits<{
  "update:modelValue": [TimeWindow];
}>();

const splitTimeValue = (
  value: string | null,
): { date: string | null; time: string | null } => {
  if (!value) return { date: null, time: null };
  if (!value.includes("T")) return { date: value, time: null };
  const [datePart, timePart = ""] = value.split("T");
  const timeMatch = timePart.match(/^\d{2}:\d{2}/);
  return { date: datePart || null, time: timeMatch ? timeMatch[0] : null };
};

const buildTimeValue = (
  date: string | null,
  time: string | null,
): string | null => {
  if (!date) return null;
  if (!time) return date;
  return `${date}T${time}`;
};

const startDate = ref<string | null>(null);
const startTime = ref<string | null>(null);
const endDate = ref<string | null>(null);
const endTime = ref<string | null>(null);

const isSyncing = ref(false);

const syncFromModel = (value: TimeWindow) => {
  const start = splitTimeValue(value?.[0] ?? null);
  const end = splitTimeValue(value?.[1] ?? null);
  startDate.value = start.date;
  startTime.value = start.time;
  endDate.value = end.date;
  endTime.value = end.time;
};

watch(
  () => props.modelValue,
  async (value) => {
    isSyncing.value = true;
    syncFromModel(value);
    await nextTick();
    isSyncing.value = false;
  },
  { immediate: true },
);

watch(startDate, (value) => {
  if (!value && startTime.value) startTime.value = null;
});

watch(endDate, (value) => {
  if (!value && endTime.value) endTime.value = null;
});

watch([startDate, startTime, endDate, endTime], () => {
  if (isSyncing.value) return;
  emit("update:modelValue", [
    buildTimeValue(startDate.value, startTime.value),
    buildTimeValue(endDate.value, endTime.value),
  ]);
});

const clearStart = () => {
  startDate.value = null;
  startTime.value = null;
};

const clearStartTime = () => {
  startTime.value = null;
};

const clearEnd = () => {
  endDate.value = null;
  endTime.value = null;
};

const clearEndTime = () => {
  endTime.value = null;
};
</script>

<style lang="scss" scoped>
.form-field {
  margin-bottom: var(--sys-spacing-medium);

  label {
    @include mx.pu-font(control);
    display: block;
    margin-bottom: var(--sys-spacing-xsmall);
    color: var(--sys-color-on-surface-variant);
  }
}

.time-range {
  display: grid;
  gap: var(--sys-spacing-small);
}

.time-block {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
}

.time-actions {
  display: grid;
  gap: var(--sys-spacing-xsmall);
}

.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sys-spacing-small);
  flex: 1;
}

input {
  @include mx.pu-font(body);
  width: 100%;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  color: var(--sys-color-on-surface);
  background: var(--sys-color-surface-container);
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));

  &::placeholder {
    color: var(--sys-color-on-surface-variant);
    opacity: 0.6;
  }

  &:focus {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: -1px;
  }
}

.clear-time {
  min-width: 64px;
}

.time-hint {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
  margin-top: var(--sys-spacing-xsmall);
}

@media (max-width: 480px) {
  .time-block {
    flex-direction: column;
    align-items: stretch;
  }

  .time-inputs {
    grid-template-columns: 1fr;
  }

  .time-actions {
    grid-template-columns: 1fr 1fr;
  }

  .clear-time {
    width: 100%;
    min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  }
}
</style>
