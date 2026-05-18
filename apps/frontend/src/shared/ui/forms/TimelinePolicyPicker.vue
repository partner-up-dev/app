<template>
  <section class="timeline-policy-picker">
    <header class="timeline-policy-picker__header">
      <h4 class="timeline-policy-picker__title">{{ resolvedTitle }}</h4>
      <p v-if="resolvedDescription" class="timeline-policy-picker__description">
        {{ resolvedDescription }}
      </p>
    </header>

    <!-- <div v-if="hasTimeline" class="timeline-policy-picker__preview">
      <div class="timeline-policy-picker__line"></div>
      <div
        v-for="marker in timelineMarkers"
        :key="marker.key"
        class="timeline-policy-picker__marker"
        :style="{ left: `${marker.position}%` }"
        :data-kind="marker.kind"
      >
        <span class="timeline-policy-picker__marker-dot"></span>
        <span class="timeline-policy-picker__marker-label">{{
          marker.label
        }}</span>
        <span class="timeline-policy-picker__marker-time">{{
          marker.timeLabel
        }}</span>
      </div>
    </div> -->

    <div class="timeline-policy-picker__controls">
      <label class="timeline-policy-picker__toggle">
        <input
          class="timeline-policy-picker__toggle-control"
          type="checkbox"
          :disabled="disabled"
          :checked="props.modelValue.confirmationEnabled"
          @change="handleConfirmationEnabledChange"
        />
        <span class="timeline-policy-picker__toggle-copy">
          <span class="timeline-policy-picker__control-label">
            {{ t("timelinePolicyPicker.confirmationEnabled") }}
          </span>
          <span class="timeline-policy-picker__control-value">
            {{ t("timelinePolicyPicker.confirmationEnabledHint") }}
          </span>
        </span>
      </label>

      <label
        v-for="control in editableControls"
        :key="control.key"
        class="timeline-policy-picker__control"
      >
        <div class="timeline-policy-picker__control-header">
          <span class="timeline-policy-picker__control-label">{{
            control.label
          }}</span>
          <span class="timeline-policy-picker__control-value">
            {{ control.summary }}
          </span>
        </div>
        <input
          class="timeline-policy-picker__number"
          type="number"
          min="0"
          :step="stepMinutes"
          :disabled="disabled || control.confirmationOnlyDisabled"
          :value="control.value"
          @input="handleOffsetInput(control.key, $event)"
        />
      </label>
    </div>

    <p v-if="validationMessage" class="timeline-policy-picker__validation">
      {{ validationMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type TimelinePolicyValue = {
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
};

const props = withDefaults(
  defineProps<{
    modelValue: TimelinePolicyValue;
    title?: string;
    description?: string | null;
    eventStartAt: string | null;
    disabled?: boolean;
    stepMinutes?: number;
    validationMessage?: string | null;
  }>(),
  {
    description: null,
    disabled: false,
    stepMinutes: 5,
    validationMessage: null,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: TimelinePolicyValue];
}>();

const { t } = useI18n();

const resolvedTitle = computed(
  () => props.title ?? t("timelinePolicyPicker.title"),
);
const resolvedDescription = computed(
  () => props.description ?? t("timelinePolicyPicker.description"),
);

const editableControls = computed(() => [
  {
    key: "confirmationStartOffsetMinutes" as const,
    label: t("timelinePolicyPicker.confirmationStart"),
    value: props.modelValue.confirmationStartOffsetMinutes,
    summary: summarizeOffset(props.modelValue.confirmationStartOffsetMinutes),
    confirmationOnlyDisabled: !props.modelValue.confirmationEnabled,
  },
  {
    key: "confirmationEndOffsetMinutes" as const,
    label: t("timelinePolicyPicker.confirmationEnd"),
    value: props.modelValue.confirmationEndOffsetMinutes,
    summary: summarizeOffset(props.modelValue.confirmationEndOffsetMinutes),
    confirmationOnlyDisabled: !props.modelValue.confirmationEnabled,
  },
  {
    key: "joinLockOffsetMinutes" as const,
    label: t("timelinePolicyPicker.joinLock"),
    value: props.modelValue.joinLockOffsetMinutes,
    summary: summarizeOffset(props.modelValue.joinLockOffsetMinutes),
    confirmationOnlyDisabled: false,
  },
]);

const eventStartDate = computed(() => parseDate(props.eventStartAt));
const timelineMarkers = computed(() => {
  const startDate = eventStartDate.value;
  if (!startDate) return [];

  const rawMarkers = [
    {
      key: "confirmation-start",
      kind: "editable",
      label: t("timelinePolicyPicker.confirmationStartMarker"),
      at: offsetFromStart(
        startDate,
        props.modelValue.confirmationStartOffsetMinutes,
      ),
    },
    {
      key: "confirmation-end",
      kind: "editable",
      label: t("timelinePolicyPicker.confirmationEndMarker"),
      at: offsetFromStart(
        startDate,
        props.modelValue.confirmationEndOffsetMinutes,
      ),
    },
    {
      key: "join-lock",
      kind: "editable",
      label: t("timelinePolicyPicker.joinLockMarker"),
      at: offsetFromStart(startDate, props.modelValue.joinLockOffsetMinutes),
    },
    {
      key: "event-start",
      kind: "reference",
      label: t("timelinePolicyPicker.eventStart"),
      at: startDate,
    },
  ].filter((marker) => marker.at !== null);

  if (rawMarkers.length === 0) return [];

  const timestamps = rawMarkers.map((marker) => marker.at!.getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const span = Math.max(1, maxTime - minTime);

  return rawMarkers.map((marker) => ({
    ...marker,
    position: ((marker.at!.getTime() - minTime) / span) * 100,
    timeLabel:
      formatLocalDateTimeValue(marker.at!.toISOString()) ??
      marker.at!.toISOString(),
  }));
});

const hasTimeline = computed(() => timelineMarkers.value.length > 0);

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function offsetFromStart(startDate: Date, offsetMinutes: number): Date {
  return new Date(startDate.getTime() - offsetMinutes * 60 * 1000);
}

function summarizeOffset(offsetMinutes: number): string {
  if (offsetMinutes < 60) {
    return t("timelinePolicyPicker.offsetMinutes", { minutes: offsetMinutes });
  }
  const hours = Math.floor(offsetMinutes / 60);
  const mins = offsetMinutes % 60;
  if (mins === 0) {
    return t("timelinePolicyPicker.offsetHours", { hours });
  }
  return t("timelinePolicyPicker.offsetHoursMinutes", { hours, minutes: mins });
}

function handleOffsetInput(key: keyof TimelinePolicyValue, event: Event): void {
  const target = event.target as HTMLInputElement;
  const parsed = Number.parseInt(target.value, 10);
  const normalized = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

  emit("update:modelValue", {
    ...props.modelValue,
    [key]: normalized,
  });
}

function handleConfirmationEnabledChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", {
    ...props.modelValue,
    confirmationEnabled: target.checked,
  });
}
</script>

<style lang="scss" scoped>
.timeline-policy-picker {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface);
}

.timeline-policy-picker__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.timeline-policy-picker__title {
  margin: 0;
  @include mx.pu-font(title-small);
}

.timeline-policy-picker__description,
.timeline-policy-picker__validation {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.timeline-policy-picker__validation {
  color: var(--sys-color-error);
}

.timeline-policy-picker__preview {
  position: relative;
  min-height: 80px;
  padding: var(--sys-spacing-large) 0;
}

.timeline-policy-picker__line {
  position: absolute;
  inset: 50% 0 auto;
  height: 2px;
  background: var(--sys-color-outline-variant);
}

.timeline-policy-picker__marker {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  text-align: center;
}

.timeline-policy-picker__marker-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--sys-color-primary);
  border: 2px solid var(--sys-color-surface);
  box-shadow: 0 0 0 1px var(--sys-color-outline-variant);
}

.timeline-policy-picker__marker[data-kind="reference"]
  .timeline-policy-picker__marker-dot {
  background: var(--sys-color-tertiary);
}

.timeline-policy-picker__marker-label {
  @include mx.pu-font(label-small);
}

.timeline-policy-picker__marker-time {
  max-width: 108px;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.timeline-policy-picker__controls {
  display: grid;
  gap: var(--sys-spacing-small);
}

.timeline-policy-picker__control {
  display: grid;
  gap: var(--sys-spacing-xsmall);
}

.timeline-policy-picker__toggle {
  display: flex;
  gap: var(--sys-spacing-small);
  align-items: flex-start;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
}

.timeline-policy-picker__toggle-control {
  margin-top: 2px;
}

.timeline-policy-picker__toggle-copy {
  display: grid;
  gap: calc(var(--sys-spacing-xsmall) / 2);
}

.timeline-policy-picker__control-header {
  display: flex;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  align-items: baseline;
}

.timeline-policy-picker__control-label {
  @include mx.pu-font(label-medium);
}

.timeline-policy-picker__control-value {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.timeline-policy-picker__number {
  width: 100%;
}

.timeline-policy-picker__number {
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}
</style>
