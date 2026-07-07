<template>
  <div class="product-local-date-calendar-picker">
    <div class="product-local-date-calendar-picker__header">
      <span>{{ monthLabel }}</span>
      <span
        v-if="rangeLabel"
        class="product-local-date-calendar-picker__range"
      >
        {{ rangeLabel }}
      </span>
    </div>

    <div class="product-local-date-calendar-picker__weekday-row">
      <span
        v-for="weekdayLabel in props.weekdayLabels"
        :key="weekdayLabel"
        class="product-local-date-calendar-picker__weekday"
      >
        {{ weekdayLabel }}
      </span>
    </div>

    <div class="product-local-date-calendar-picker__grid">
      <button
        v-for="cell in calendarCells"
        :key="cell.dateKey"
        type="button"
        class="product-local-date-calendar-picker__cell"
        :class="{
          'product-local-date-calendar-picker__cell--disabled':
            !cell.isSelectable,
          'product-local-date-calendar-picker__cell--selected':
            cell.isSelected,
          'product-local-date-calendar-picker__cell--today': cell.isToday,
        }"
        :disabled="props.disabled || !cell.isSelectable"
        @click="toggleDate(cell.dateKey)"
      >
        <span class="product-local-date-calendar-picker__day">
          {{ cell.dayOfMonth }}
        </span>
        <span
          v-if="cell.isToday && props.todayLabel"
          class="product-local-date-calendar-picker__marker"
        >
          {{ props.todayLabel }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ProductLocalDateKey } from "@/shared/datetime/productLocalDate";
import {
  formatProductLocalMonthLabel,
  formatProductLocalShortDateLabel,
  getTodayProductLocalDateKey,
  isProductLocalDateKey,
  normalizeProductLocalDateKeys,
  parseProductLocalDateKey,
} from "@/shared/datetime/productLocalDate";

type CalendarCell = {
  dateKey: ProductLocalDateKey;
  dayOfMonth: string;
  isSelectable: boolean;
  isSelected: boolean;
  isToday: boolean;
};

const props = withDefaults(
  defineProps<{
    modelValue: readonly ProductLocalDateKey[];
    visibleDateKeys: readonly ProductLocalDateKey[];
    selectableDateKeys: readonly ProductLocalDateKey[];
    weekdayLabels: readonly string[];
    disabled?: boolean;
    todayLabel?: string | null;
  }>(),
  {
    disabled: false,
    todayLabel: null,
  },
);

const emit = defineEmits<{
  "update:modelValue": [dates: ProductLocalDateKey[]];
}>();

const todayDateKey = getTodayProductLocalDateKey();

const orderedVisibleDateKeys = computed<ProductLocalDateKey[]>(() =>
  Array.from(
    new Set(
      props.visibleDateKeys.filter((value): value is ProductLocalDateKey =>
        isProductLocalDateKey(value),
      ),
    ),
  ),
);

const selectableDateSet = computed(
  () => new Set(normalizeProductLocalDateKeys(props.selectableDateKeys)),
);

const visibleDateSet = computed(
  () => new Set<ProductLocalDateKey>(orderedVisibleDateKeys.value),
);

const selectedDateKeys = computed<ProductLocalDateKey[]>(() =>
  normalizeProductLocalDateKeys(props.modelValue).filter(
    (dateKey) =>
      visibleDateSet.value.has(dateKey) && selectableDateSet.value.has(dateKey),
  ),
);

const monthLabel = computed(() => {
  const firstDateKey = orderedVisibleDateKeys.value[0];
  const lastDateKey =
    orderedVisibleDateKeys.value[orderedVisibleDateKeys.value.length - 1];
  if (!firstDateKey || !lastDateKey) {
    return "";
  }

  const firstMonthLabel = formatProductLocalMonthLabel(firstDateKey);
  const lastMonthLabel = formatProductLocalMonthLabel(lastDateKey);
  return firstMonthLabel === lastMonthLabel
    ? firstMonthLabel
    : `${firstMonthLabel} - ${lastMonthLabel}`;
});

const rangeLabel = computed(() => {
  const firstDateKey = orderedVisibleDateKeys.value[0];
  const lastDateKey =
    orderedVisibleDateKeys.value[orderedVisibleDateKeys.value.length - 1];
  if (!firstDateKey || !lastDateKey) {
    return "";
  }

  return `${formatProductLocalShortDateLabel(firstDateKey)} - ${formatProductLocalShortDateLabel(lastDateKey)}`;
});

const calendarCells = computed<CalendarCell[]>(() => {
  const selectedDateSet = new Set(selectedDateKeys.value);

  return orderedVisibleDateKeys.value.map((dateKey) => {
    const parsedDate = parseProductLocalDateKey(dateKey);
    return {
      dateKey,
      dayOfMonth: parsedDate ? String(parsedDate.getUTCDate()) : dateKey,
      isSelectable: selectableDateSet.value.has(dateKey),
      isSelected: selectedDateSet.has(dateKey),
      isToday: dateKey === todayDateKey,
    };
  });
});

const toggleDate = (dateKey: ProductLocalDateKey) => {
  if (!selectableDateSet.value.has(dateKey)) {
    return;
  }

  const nextSelected = new Set(selectedDateKeys.value);
  if (nextSelected.has(dateKey)) {
    nextSelected.delete(dateKey);
  } else {
    nextSelected.add(dateKey);
  }

  emit(
    "update:modelValue",
    Array.from(nextSelected).sort((left, right) => left.localeCompare(right)),
  );
};
</script>

<style lang="scss" scoped>
.product-local-date-calendar-picker {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-low);
}

.product-local-date-calendar-picker__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
  @include mx.pu-font(control);
}

.product-local-date-calendar-picker__range {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(control);
}

.product-local-date-calendar-picker__weekday-row,
.product-local-date-calendar-picker__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--sys-spacing-xsmall);
}

.product-local-date-calendar-picker__weekday {
  text-align: center;
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(control);
}

.product-local-date-calendar-picker__cell {
  display: flex;
  min-height: 3.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    color 180ms ease,
    opacity 180ms ease;
}

.product-local-date-calendar-picker__cell--selected {
  border-color: var(--sys-color-primary);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
}

.product-local-date-calendar-picker__cell--today {
  border-style: dashed;
}

.product-local-date-calendar-picker__cell--disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.product-local-date-calendar-picker__day {
  @include mx.pu-font(section);
}

.product-local-date-calendar-picker__marker {
  @include mx.pu-font(caption);
}
</style>
