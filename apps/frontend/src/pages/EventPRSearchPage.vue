<template>
  <PuPageScaffold class="event-pr-search-page" data-page="event-pr-search">
    <template #pageHeader>
      <PuHeader
        :title="pageTitle"
        :subtitle="pageSubtitle"
        title-as="h1"
      >
        <template #leading>
          <PuButton
            tone="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('common.backToHome')"
            @click="handleBack"
          >
            <template #leading>
              <span class="i-mdi-arrow-left" aria-hidden="true"></span>
            </template>
          </PuButton>
        </template>

        <template #actions>
          <PuButton
            v-if="isResultMode"
            tone="neutral" variant="ghost"
            size="sm"
            @click="showCriteriaDrawer = true"
          >
            {{ t("eventPRSearch.actions.modifyCriteria") }}
          </PuButton>
        </template>
      </PuHeader>
    </template>

    <div v-if="eventsQuery.isLoading.value" class="event-pr-search-page__state">
      {{ t("common.loading") }}
    </div>

    <PuEmptyState
      v-else-if="eventsQuery.isError.value"
      :title="t('eventPRSearch.loadEventsFailed')"
      :description="t('eventPRSearch.loadEventsFailedHint')"
      icon="i-mdi-alert-circle-outline"
    >
      <template #actions>
        <PuButton tone="neutral" variant="outline" @click="goEventPlaza">
          {{ t("eventPRSearch.actions.goEventPlaza") }}
        </PuButton>
      </template>
    </PuEmptyState>

    <PuEmptyState
      v-else-if="availableEvents.length === 0"
      :title="t('eventPRSearch.emptyEventsTitle')"
      :description="t('eventPRSearch.emptyEventsDescription')"
      icon="i-mdi-calendar-blank-outline"
    >
      <template #actions>
        <PuButton tone="neutral" variant="outline" @click="goHome">
          {{ t("eventPRSearch.actions.backHome") }}
        </PuButton>
      </template>
    </PuEmptyState>

    <template v-else-if="!isResultMode">
      <EventPRSearchCriteriaForm
        v-model:selected-event-id="formEventId"
        v-model:selected-dates="formDates"
        :events="availableEvents"
      />

      <div class="event-pr-search-page__footer-actions mt-4">
        <PuButton tone="neutral" variant="outline" block @click="goHome">
          {{ t("eventPRSearch.actions.backHome") }}
        </PuButton>
        <PuButton block :disabled="!canSubmitForm" @click="submitSearch">
          {{ t("eventPRSearch.actions.search") }}
        </PuButton>
      </div>
    </template>

    <template v-else>
      <div v-if="isAutoRedirecting" class="event-pr-search-page__state">
        {{ t("eventPRSearch.redirectingSingleResult") }}
      </div>

      <div
        v-else-if="searchQuery.isLoading.value"
        class="event-pr-search-page__state"
      >
        {{ t("common.loading") }}
      </div>

      <PuEmptyState
        v-else-if="searchQuery.isError.value"
        :title="t('eventPRSearch.loadFailed')"
        :description="searchErrorMessage"
        icon="i-mdi-alert-circle-outline"
      >
        <template #actions>
          <PuButton tone="neutral" variant="outline" @click="showCriteriaDrawer = true">
            {{ t("eventPRSearch.actions.modifyCriteria") }}
          </PuButton>
          <PuButton tone="neutral" variant="soft" @click="goEventPlaza">
            {{ t("eventPRSearch.actions.goEventPlaza") }}
          </PuButton>
        </template>
      </PuEmptyState>

      <template v-else>
        <p class="event-pr-search-page__summary">
          {{
            t("eventPRSearch.resultSummary", { count: searchResults.length })
          }}
        </p>

        <div
          v-if="searchResults.length > 0"
          class="event-pr-search-page__result-list"
        >
          <PRPreviewCard
            v-for="result in searchResults"
            :key="result.pr.id"
            :pr-id="result.pr.id as PRId"
            :time-label="formatSearchResultTimeLabel(result)"
          />
        </div>

        <PuEmptyState
          v-else
          :title="t('eventPRSearch.emptyResultTitle')"
          :description="t('eventPRSearch.emptyResultDescription')"
          icon="i-mdi-calendar-remove-outline"
        >
          <template #actions>
            <PuButton tone="neutral" variant="outline" @click="showCriteriaDrawer = true">
              {{ t("eventPRSearch.actions.modifyCriteria") }}
            </PuButton>
            <PuButton tone="neutral" variant="soft" @click="goEventPlaza">
              {{ t("eventPRSearch.actions.goEventPlaza") }}
            </PuButton>
          </template>
        </PuEmptyState>
      </template>

      <PuDrawer
        v-model:visible="showCriteriaDrawer"
        :title="t('eventPRSearch.drawerTitle')"
      >
        <EventPRSearchCriteriaForm
          v-model:selected-event-id="drawerEventId"
          v-model:selected-dates="drawerDates"
          :events="availableEvents"
        />

        <template #footer>
          <div class="event-pr-search-page__drawer-actions">
            <PuButton tone="neutral" variant="outline" block @click="showCriteriaDrawer = false">
              {{ t("common.cancel") }}
            </PuButton>
            <PuButton
              block
              :disabled="!canApplyDrawerCriteria"
              @click="applyDrawerCriteria"
            >
              {{ t("eventPRSearch.actions.applyCriteria") }}
            </PuButton>
          </div>
        </template>
      </PuDrawer>
    </template>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import {
  PuButton,
  PuDrawer,
  PuEmptyState,
  PuHeader,
  PuPageScaffold,
} from "@partner-up-dev/design-web";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";
import EventPRSearchCriteriaForm from "@/domains/event/ui/composites/EventPRSearchCriteriaForm.vue";
import type { AnchorEventListItem } from "@/domains/event/model/types";
import type { PRSearchResult } from "@/domains/pr/model/types";
import { useEventPRSearch } from "@/domains/pr/queries/useEventPRSearch";
import PRPreviewCard from "@/domains/pr/ui/primitives/PRPreviewCard.vue";
import { prDetailPath } from "@/domains/pr/routing/routes";
import { useFallbackBack } from "@/shared/routing/useFallbackBack";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import {
  formatProductLocalShortDateLabel,
  getProductLocalWeekStartDateKey,
  getTodayProductLocalDateKey,
  listProductLocalDateKeysFrom,
  normalizeProductLocalDateKeys,
} from "@/shared/datetime/productLocalDate";

const SEARCH_CALENDAR_WEEK_COUNT = 4;
const DAYS_PER_WEEK = 7;

type SearchCriteria = {
  eventId: number;
  dates: string[];
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { handleBack } = useFallbackBack({ name: "event-plaza" });

const eventsQuery = useAnchorEvents();
const availableEvents = computed<AnchorEventListItem[]>(
  () => eventsQuery.data.value ?? [],
);

const todayDateKey = getTodayProductLocalDateKey();
const defaultDateKeys = listProductLocalDateKeysFrom(todayDateKey, 3);
const calendarWindowStartDateKey =
  getProductLocalWeekStartDateKey(todayDateKey) ?? todayDateKey;
const allowedDateKeys = listProductLocalDateKeysFrom(
  calendarWindowStartDateKey,
  SEARCH_CALENDAR_WEEK_COUNT * DAYS_PER_WEEK,
).filter((dateKey) => dateKey >= todayDateKey);
const allowedDateSet = new Set(allowedDateKeys);

const formEventId = ref<number | null>(null);
const formDates = ref<string[]>([]);
const drawerEventId = ref<number | null>(null);
const drawerDates = ref<string[]>([]);
const showCriteriaDrawer = ref(false);
const isAutoRedirecting = ref(false);
const lastAutoRedirectCriteriaKey = ref<string | null>(null);

const readQueryString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const readRouteDateValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return [value];
  }
  return [];
};

const normalizeCriteriaDates = (dates: string[]): string[] => {
  const normalized = normalizeProductLocalDateKeys(dates).filter((dateKey) =>
    allowedDateSet.has(dateKey),
  );
  return normalized.length > 0 ? normalized : [...defaultDateKeys];
};

const resolveDefaultEventId = (): number | null =>
  availableEvents.value[0]?.id ?? null;

const resolveEventId = (value: unknown): number | null => {
  const raw = readQueryString(value);
  if (!raw) {
    return resolveDefaultEventId();
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return resolveDefaultEventId();
  }

  const matchedEvent = availableEvents.value.find(
    (event) => event.id === parsed,
  );
  return matchedEvent?.id ?? resolveDefaultEventId();
};

const routeHasSearchIntent = computed(
  () =>
    readQueryString(route.query.eventId) !== null ||
    readRouteDateValues(route.query.date).length > 0,
);

const appliedCriteria = computed<SearchCriteria | null>(() => {
  if (!routeHasSearchIntent.value || availableEvents.value.length === 0) {
    return null;
  }

  const eventId = resolveEventId(route.query.eventId);
  if (eventId === null) {
    return null;
  }

  return {
    eventId,
    dates: normalizeCriteriaDates(readRouteDateValues(route.query.date)),
  };
});

const buildSearchQuery = (criteria: SearchCriteria) => ({
  ...route.query,
  eventId: criteria.eventId.toString(),
  date: criteria.dates,
});

const isSameSearchQuery = (criteria: SearchCriteria): boolean => {
  const routeEventId = readQueryString(route.query.eventId);
  const routeDates = normalizeProductLocalDateKeys(
    readRouteDateValues(route.query.date),
  );

  if (routeEventId !== criteria.eventId.toString()) {
    return false;
  }

  if (routeDates.length !== criteria.dates.length) {
    return false;
  }

  return routeDates.every((value, index) => value === criteria.dates[index]);
};

watch(
  [availableEvents, routeHasSearchIntent, appliedCriteria],
  ([events, hasSearchIntent, criteria]) => {
    if (events.length === 0) {
      formEventId.value = null;
      formDates.value = [];
      return;
    }

    if (hasSearchIntent && criteria) {
      formEventId.value = criteria.eventId;
      formDates.value = [...criteria.dates];
      return;
    }

    const defaultEventId = resolveDefaultEventId();
    if (
      formEventId.value === null ||
      !events.some((event) => event.id === formEventId.value)
    ) {
      formEventId.value = defaultEventId;
    }
    if (formDates.value.length === 0) {
      formDates.value = [...defaultDateKeys];
    }
  },
  { immediate: true },
);

watch(
  appliedCriteria,
  async (criteria) => {
    if (
      !criteria ||
      !routeHasSearchIntent.value ||
      isSameSearchQuery(criteria)
    ) {
      return;
    }

    await router.replace({
      name: "event-pr-search",
      query: buildSearchQuery(criteria),
    });
  },
  { immediate: true },
);

watch(showCriteriaDrawer, (isOpen) => {
  if (!isOpen || !appliedCriteria.value) {
    return;
  }

  drawerEventId.value = appliedCriteria.value.eventId;
  drawerDates.value = [...appliedCriteria.value.dates];
});

const searchEnabled = computed(
  () => routeHasSearchIntent.value && appliedCriteria.value !== null,
);
const searchQuery = useEventPRSearch(appliedCriteria, searchEnabled);
const searchResults = computed<PRSearchResult[]>(
  () => searchQuery.data.value?.results ?? [],
);

const isResultMode = computed(() => routeHasSearchIntent.value);

const selectedEventTitle = computed(() => {
  const currentCriteria = appliedCriteria.value;
  if (currentCriteria) {
    return availableEvents.value.find(
      (event) => event.id === currentCriteria.eventId,
    )?.title;
  }

  return availableEvents.value.find((event) => event.id === formEventId.value)
    ?.title;
});

const criteriaDateSummary = computed(() => {
  const dates = appliedCriteria.value?.dates ?? formDates.value;
  return normalizeProductLocalDateKeys(dates)
    .map((dateKey) => formatProductLocalShortDateLabel(dateKey))
    .join("、");
});

const pageTitle = computed(() =>
  isResultMode.value
    ? t("eventPRSearch.resultTitle")
    : t("eventPRSearch.title"),
);

const pageSubtitle = computed(() => {
  if (!isResultMode.value) {
    return "";
  }

  if (!selectedEventTitle.value || !criteriaDateSummary.value) {
    return t("eventPRSearch.resultSubtitleFallback");
  }

  return `${selectedEventTitle.value} · ${criteriaDateSummary.value}`;
});

const canSubmitForm = computed(
  () =>
    formEventId.value !== null &&
    normalizeCriteriaDates(formDates.value).length > 0,
);
const canApplyDrawerCriteria = computed(
  () =>
    drawerEventId.value !== null &&
    normalizeCriteriaDates(drawerDates.value).length > 0,
);

const searchErrorMessage = computed(
  () => searchQuery.error.value?.message ?? t("eventPRSearch.loadFailedHint"),
);

const formatSearchResultTimeLabel = (result: PRSearchResult): string =>
  formatLocalDateTimeValue(result.pr.time[0], {
    includeDate: true,
    includeTime: true,
  }) ?? t("eventPRSearch.resultCard.unknownTime");

const buildCriteriaKey = (criteria: SearchCriteria): string =>
  `${criteria.eventId}:${criteria.dates.join(",")}`;

watch(
  [
    appliedCriteria,
    searchResults,
    () => searchQuery.isLoading.value,
    () => searchQuery.isError.value,
  ],
  async ([criteria, results, isLoading, isError]) => {
    if (!criteria || isLoading || isError || results.length !== 1) {
      return;
    }

    const criteriaKey = buildCriteriaKey(criteria);
    if (lastAutoRedirectCriteriaKey.value === criteriaKey) {
      return;
    }

    lastAutoRedirectCriteriaKey.value = criteriaKey;
    isAutoRedirecting.value = true;
    await router.replace(prDetailPath(results[0]!.pr.id as PRId));
  },
);

const submitSearch = async () => {
  if (formEventId.value === null) {
    return;
  }

  await router.push({
    name: "event-pr-search",
    query: buildSearchQuery({
      eventId: formEventId.value,
      dates: normalizeCriteriaDates(formDates.value),
    }),
  });
};

const applyDrawerCriteria = async () => {
  if (drawerEventId.value === null) {
    return;
  }

  showCriteriaDrawer.value = false;
  isAutoRedirecting.value = false;
  await router.replace({
    name: "event-pr-search",
    query: buildSearchQuery({
      eventId: drawerEventId.value,
      dates: normalizeCriteriaDates(drawerDates.value),
    }),
  });
};

const goHome = async () => {
  await router.push({ name: "home" });
};

const goEventPlaza = async () => {
  await router.push({ name: "event-plaza" });
};
</script>

<style lang="scss" scoped>
.event-pr-search-page__state,
.event-pr-search-page__summary {
  margin: 0;
}

.event-pr-search-page__state {
  padding: var(--sys-spacing-xlarge) 0;
  text-align: center;
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body);
}

.event-pr-search-page__summary {
  margin-bottom: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body);
}

.event-pr-search-page__result-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.event-pr-search-page__footer-actions,
.event-pr-search-page__drawer-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}
</style>
