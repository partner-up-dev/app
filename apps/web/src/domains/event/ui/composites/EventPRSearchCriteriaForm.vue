<template>
  <div class="event-pr-search-form">
    <section class="event-pr-search-form__section">
      <div class="event-pr-search-form__section-header">
        <h2>{{ t("eventPRSearch.form.eventTitle") }}</h2>
      </div>

      <AnchorEventRadioCardCarousel
        :model-value="props.selectedEventId"
        :events="props.events"
        :disabled="props.disabled"
        :aria-label="t('eventPRSearch.form.eventTitle')"
        @update:model-value="emit('update:selectedEventId', $event)"
      />
    </section>

    <section class="event-pr-search-form__section">
      <div class="event-pr-search-form__section-header">
        <h2>{{ t("eventPRSearch.form.dateTitle") }}</h2>
      </div>

      <ProductLocalDateCalendarPicker
        :model-value="selectedDateKeys"
        :visible-date-keys="calendarVisibleDateKeys"
        :selectable-date-keys="selectableDateKeys"
        :weekday-labels="weekdayLabels"
        :disabled="props.disabled"
        :today-label="t('eventPRSearch.form.todayMarker')"
        @update:model-value="emit('update:selectedDates', $event)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventListItem } from "@/domains/event/model/types";
import AnchorEventRadioCardCarousel from "@/domains/event/ui/composites/AnchorEventRadioCardCarousel.vue";
import {
  getProductLocalWeekStartDateKey,
  getTodayProductLocalDateKey,
  listProductLocalDateKeysFrom,
  normalizeProductLocalDateKeys,
} from "@/shared/datetime/productLocalDate";
import ProductLocalDateCalendarPicker from "@/shared/ui/forms/ProductLocalDateCalendarPicker.vue";

const SEARCH_CALENDAR_WEEK_COUNT = 4;
const DAYS_PER_WEEK = 7;

const props = withDefaults(
  defineProps<{
    events: AnchorEventListItem[];
    selectedEventId: number | null;
    selectedDates: string[];
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:selectedEventId": [value: number | null];
  "update:selectedDates": [value: string[]];
}>();

const { t } = useI18n();

const weekdayLabels = computed(() => [
  t("eventPRSearch.form.weekdays.mon"),
  t("eventPRSearch.form.weekdays.tue"),
  t("eventPRSearch.form.weekdays.wed"),
  t("eventPRSearch.form.weekdays.thu"),
  t("eventPRSearch.form.weekdays.fri"),
  t("eventPRSearch.form.weekdays.sat"),
  t("eventPRSearch.form.weekdays.sun"),
]);

const todayDateKey = getTodayProductLocalDateKey();
const calendarWindowStartDateKey =
  getProductLocalWeekStartDateKey(todayDateKey) ?? todayDateKey;
const calendarVisibleDateKeys = listProductLocalDateKeysFrom(
  calendarWindowStartDateKey,
  SEARCH_CALENDAR_WEEK_COUNT * DAYS_PER_WEEK,
);
const selectableDateKeys = calendarVisibleDateKeys.filter(
  (dateKey) => dateKey >= todayDateKey,
);
const selectableDateSet = new Set(selectableDateKeys);

const selectedDateKeys = computed(() =>
  normalizeProductLocalDateKeys(props.selectedDates).filter((dateKey) =>
    selectableDateSet.has(dateKey),
  ),
);
</script>

<style lang="scss" scoped>
.event-pr-search-form {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
}

.event-pr-search-form__section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.event-pr-search-form__section-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);

  h2,
  p {
    margin: 0;
  }

  h2 {
    @include mx.pu-font(section);
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
