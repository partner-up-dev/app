<template>
  <PuInlineNotice
    v-if="errorMessage"
    tone="error"
    :message="errorMessage"
    data-testid="prd.list.error"
  />

  <div class="date-section" data-testid="prd.list.view">
    <PuTabs
      v-if="dateTabs.length > 0"
      :tabs="dateTabs"
      :model-value="selectedDateKey ?? 'none'"
      variant="pill"
      size="md"
      data-testid="prd.list.date-tabs"
      @update:model-value="handleDateTabChange"
    />

    <div class="date-panel" role="tabpanel">
      <div class="batch-list" data-region="pr-list" data-testid="prd.list.pr-list">
        <div v-if="visibleListItems.length > 0" class="pr-list">
          <template v-for="item in visibleListItems" :key="item.key">
            <PRPreviewCard
              v-if="item.kind === 'persisted'"
              :pr-id="item.record.prId"
              :to="item.record.canonicalPath"
              :time-label="item.timeLabel"
              :cover-image="resolveCoverImage(item.record.location)"
              data-testid="prd.list.record"
              @open-detail="emit('record-detail', item.record)"
            />
            <PRDiscoveryCreationSuggestionCard
              v-else
              :title="typeTitle"
              :time-label="item.timeLabel"
              :display-location-name="item.suggestion.displayLocationName"
              :place-icon="item.suggestion.place.kind === 'route' ? '🧭' : '📍'"
              :preference-tags="item.suggestion.preferenceTags"
              :max-partners="authoringOptions?.authoringDefaults.maxPartners ?? null"
              :cover-image="resolveCoverImage(item.suggestion.displayLocationName)"
              :pending="pending"
              :disabled="!showCreate"
              data-testid="prd.list.creation-suggestion"
              @open-detail="handleSuggestionCreate(item.suggestion)"
            />
          </template>
        </div>

        <PuInlineNotice v-if="createErrorMessage" tone="error" :message="createErrorMessage" />
        <PuEmptyState
          v-else-if="isListExhausted"
          :title="t('prDiscovery.exhausted')"
          :description="t('prDiscovery.subscribeHint')"
          surface-level="section"
          variant="outline"
          data-region="exhausted-card"
          data-testid="prd.list.exhausted"
        >
          <template #actions>
            <a class="state-action-link" href="#other-pr-types">
              {{ t("prDiscovery.otherTypesAction") }}
            </a>
          </template>
        </PuEmptyState>
        <PuEmptyState
          v-else
          compact
          :description="
            hasBrowseTimeWindows ? t('prDiscovery.noPRsInSelectedDate') : t('prDiscovery.noBatches')
          "
          data-testid="prd.list.empty"
        />
      </div>

      <div class="batch-action-cards">
        <PRDiscoveryCreateCard
          v-if="showCreate && authoringOptions"
          :title="createCardTitle"
          :type="type"
          :type-title="typeTitle"
          :time-window="selectedCreateTimeWindow"
          :allow-edit-after-ready="selectedCreateAllowEditAfterReady"
          :place-options="activeCreatePlaceOptions"
          :initial-place-id="defaultCreatePlaceId"
          :place-label="t('prDiscovery.createCard.placeLabel')"
          :place-placeholder="t('prDiscovery.createCard.placePlaceholder')"
          :default-expanded="shouldAutoExpandCreateCard"
          :auto-expand-context-key="createCardAutoExpandContextKey"
          :pending="pending"
          :disabled="isCreateDisabled"
          :error-message="createErrorMessage"
          data-region="create-pr"
          @update:time-window="selectedCreateTimeWindow = $event"
          @update:allow-edit-after-ready="selectedCreateAllowEditAfterReady = $event"
          @create="handleCreate"
        />

        <PRDiscoveryCommunityCard
          v-if="communityQrCode !== null"
          :type="type"
          :type-title="typeTitle"
          :qr-code-url="communityQrCode"
          :default-expanded="shouldAutoExpandCommunityCard"
          :auto-expand-context-key="communityCardAutoExpandContextKey"
          variant="list"
        />

        <div id="other-pr-types">
          <OtherPRTypesSection
            :current-type="type"
            variant="panel"
            data-region="discover-other-types"
            @card-click="handleOpenType"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend/contracts";
import { PuEmptyState, PuInlineNotice, PuTabs } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  buildPRDiscoveryCreationSuggestions,
  type PRDiscoveryBrowseTimeWindow,
  type PRDiscoveryCreateTimeWindow,
  type PRDiscoveryCreationSuggestion,
} from "@/domains/pr/model/pr-discovery-creation-suggestion";
import {
  clonePRDiscoveryRoute,
  type PRDiscoveryPlaceOption,
  type PRDiscoveryPlaceSelection,
} from "@/domains/pr/model/pr-discovery-place-options";
import {
  pickRandomPoiGalleryImage,
  toPoiGalleryMap,
} from "@/domains/pr/model/pr-discovery-poi-gallery";
import {
  formatPRDiscoveryDateKeyLabel,
  formatPRDiscoveryTimeWindowTimeLabel,
  hasPRDiscoveryTimeWindowStarted,
  isEndedPRDiscoveryTimeWindow,
  resolvePRDiscoveryTimeWindowDateKey,
  resolvePRDiscoveryTimeWindowStartTimestamp,
  type TimeWindow,
  timeWindowsEqual,
} from "@/domains/pr/model/pr-discovery-time-window";
import {
  type PRDiscoveryCatalogItem,
  type PRDiscoveryListRecord,
  type PRDiscoveryPersistedCandidate,
  type PRDiscoveryTypeDetail,
} from "@/domains/pr/model/pr-discovery-types";
import type { PRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";
import OtherPRTypesSection from "@/domains/pr/ui/discovery/list/OtherPRTypesSection.vue";
import PRDiscoveryCommunityCard from "@/domains/pr/ui/discovery/list/PRDiscoveryCommunityCard.vue";
import PRDiscoveryCreateCard from "@/domains/pr/ui/discovery/list/PRDiscoveryCreateCard.vue";
import PRDiscoveryCreationSuggestionCard from "@/domains/pr/ui/discovery/list/PRDiscoveryCreationSuggestionCard.vue";
import PRPreviewCard from "@/domains/pr/ui/primitives/PRPreviewCard.vue";
import {
  buildPRDiscoveryDirectCreateCommand,
  buildPRDiscoverySuggestionCreateCommand,
  type PRDiscoveryDirectCreateCommand,
} from "@/domains/pr/use-cases/usePRDiscoveryCreation";
import {
  getTodayProductLocalDateKey,
  isProductLocalDateKey,
} from "@/shared/datetime/productLocalDate";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";

type DateTabItem = { value: string; label: string };
type VisiblePersistedItem = {
  kind: "persisted";
  key: string;
  dateKey: string;
  record: PRDiscoveryListRecord;
  timeLabel: string;
};
type VisibleSuggestionItem = {
  kind: "suggestion";
  key: string;
  dateKey: string;
  suggestion: PRDiscoveryCreationSuggestion;
  timeLabel: string;
};
type VisibleListItem = VisiblePersistedItem | VisibleSuggestionItem;
type DateGroup = {
  key: string;
  isExpiredDate: boolean;
  listRecords: PRDiscoveryListRecord[];
  browseTimeWindows: PRDiscoveryBrowseTimeWindow[];
  createTimeWindows: PRDiscoveryCreateTimeWindow[];
};

const props = withDefaults(
  defineProps<{
    type?: string;
    typeDetail?: PRDiscoveryTypeDetail | null;
    candidates?: readonly PRDiscoveryPersistedCandidate[];
    listRecords?: readonly PRDiscoveryListRecord[];
    suggestions?: readonly PRDiscoveryCreationSuggestion[];
    authoringOptions?: PRAuthoringOptions | null;
    otherTypes?: readonly PRDiscoveryCatalogItem[];
    showCreate?: boolean;
    exhausted?: boolean;
    pending?: boolean;
    errorMessage?: string | null;
    createErrorMessage?: string | null;
  }>(),
  {
    type: "",
    typeDetail: null,
    candidates: () => [],
    listRecords: () => [],
    suggestions: () => [],
    authoringOptions: null,
    otherTypes: () => [],
    showCreate: false,
    exhausted: false,
    pending: false,
    errorMessage: null,
    createErrorMessage: null,
  },
);

const emit = defineEmits<{
  "record-detail": [record: PRDiscoveryListRecord];
  "create-direct": [command: PRDiscoveryDirectCreateCommand];
  "create-suggestion": [suggestion: PRDiscoveryCreationSuggestion];
  "open-type": [type: string];
}>();

const { t } = useI18n();
const selectedDateKey = ref<string | null>(null);
const selectedCreateTimeWindow = ref<TimeWindow | null>(null);
const selectedCreateAllowEditAfterReady = ref<PRAllowEditAfterReady | null>(null);

const typeTitle = computed(() => props.typeDetail?.title?.trim() || t("prAuthoring.typeFallback"));
const communityQrCode = computed(() => props.typeDetail?.communityQrCode ?? null);
const listRecordsForView = computed<readonly PRDiscoveryListRecord[]>(() =>
  props.listRecords.length > 0
    ? props.listRecords
    : props.candidates.map((candidate) => ({ ...candidate, status: "OPEN" as const })),
);
const hasBrowseTimeWindows = computed(() => listRecordsForView.value.length > 0);

const allPlaceOptions = computed<PRDiscoveryPlaceOption[]>(() => {
  const options = props.authoringOptions;
  if (!options) return [];
  return [
    ...options.locationOptions.map((option) => ({
      ...option,
      gallery: [...option.gallery],
      availableStartKeys: [...option.availableStartKeys],
    })),
    ...options.routeOptions.map((option) => ({
      ...option,
      route: clonePRDiscoveryRoute(option.route),
      availableStartKeys: [...option.availableStartKeys],
    })),
  ];
});
const selectedCreateEntry = computed(
  () =>
    createTimeWindows.value.find((entry) =>
      timeWindowsEqual(entry.timeWindow, selectedCreateTimeWindow.value),
    ) ?? null,
);
const activeCreatePlaceOptions = computed(
  () => selectedCreateEntry.value?.placeOptions ?? allPlaceOptions.value,
);
const defaultCreatePlaceId = computed(() => {
  const selection = props.authoringOptions?.defaultSelection;
  if (!selection) return null;
  return (
    activeCreatePlaceOptions.value.find(
      (option) =>
        option.kind === "location" &&
        option.locationId === selection.locationId &&
        !option.disabled,
    )?.id ?? null
  );
});

const browseTimeWindows = computed<PRDiscoveryBrowseTimeWindow[]>(() => {
  const groups = new Map<string, PRDiscoveryBrowseTimeWindow>();
  for (const candidate of props.candidates) {
    const key = [candidate.time[0] ?? "_", candidate.time[1] ?? "_"].join("::");
    const current = groups.get(key);
    if (current) {
      current.candidates = [...current.candidates, candidate];
    } else {
      groups.set(key, { key, timeWindow: candidate.time, candidates: [candidate] });
    }
  }
  return [...groups.values()].sort(
    (left, right) =>
      resolvePRDiscoveryTimeWindowStartTimestamp(left.timeWindow) -
      resolvePRDiscoveryTimeWindowStartTimestamp(right.timeWindow),
  );
});

const createTimeWindows = computed<PRDiscoveryCreateTimeWindow[]>(() =>
  (props.authoringOptions?.startOptions ?? [])
    .map((entry) => ({
      key: entry.key,
      timeWindow: [entry.startAt, entry.endAt] satisfies TimeWindow,
      placeOptions: [
        ...entry.locationOptions.map((option) => ({
          ...option,
          gallery: [...option.gallery],
          availableStartKeys: [...option.availableStartKeys],
        })),
        ...entry.routeOptions.map((option) => ({
          ...option,
          route: clonePRDiscoveryRoute(option.route),
          availableStartKeys: [...option.availableStartKeys],
        })),
      ],
    }))
    .filter((entry) => !hasPRDiscoveryTimeWindowStarted(entry.timeWindow))
    .sort(
      (left, right) =>
        resolvePRDiscoveryTimeWindowStartTimestamp(left.timeWindow) -
        resolvePRDiscoveryTimeWindowStartTimestamp(right.timeWindow),
    ),
);

const generatedSuggestions = computed(() =>
  buildPRDiscoveryCreationSuggestions({
    browseTimeWindows: browseTimeWindows.value,
    createTimeWindows: createTimeWindows.value,
    presetTags: props.authoringOptions?.preferenceTags ?? [],
  }),
);
const allSuggestions = computed(() =>
  props.suggestions.length > 0 ? [...props.suggestions] : generatedSuggestions.value,
);

watch(
  () => props.authoringOptions?.defaultSelection ?? null,
  (selection) => {
    if (!selection) return;
    const matched = props.authoringOptions?.startOptions.find(
      (option) => option.startAt === selection.startAt,
    );
    if (matched) selectedCreateTimeWindow.value = [matched.startAt, matched.endAt];
  },
  { immediate: true },
);

const isExpiredDateGroupKey = (groupKey: string, todayDateKey: string): boolean =>
  isProductLocalDateKey(groupKey) && groupKey < todayDateKey;

const dateGroups = computed<DateGroup[]>(() => {
  const groups = new Map<string, DateGroup>();
  const todayDateKey = getTodayProductLocalDateKey();

  const ensureGroup = (key: string): DateGroup => {
    const existing = groups.get(key);
    if (existing) return existing;
    const created: DateGroup = {
      key,
      isExpiredDate: isExpiredDateGroupKey(key, todayDateKey),
      listRecords: [],
      browseTimeWindows: [],
      createTimeWindows: [],
    };
    groups.set(key, created);
    return created;
  };

  for (const entry of browseTimeWindows.value) {
    const key = resolvePRDiscoveryTimeWindowDateKey(entry.timeWindow);
    if (key) ensureGroup(key).browseTimeWindows.push(entry);
  }
  for (const record of listRecordsForView.value) {
    const key = resolvePRDiscoveryTimeWindowDateKey(record.time);
    if (key) ensureGroup(key).listRecords.push(record);
  }
  for (const entry of createTimeWindows.value) {
    const key = resolvePRDiscoveryTimeWindowDateKey(entry.timeWindow);
    if (key) ensureGroup(key).createTimeWindows.push(entry);
  }

  const sortedGroups = [...groups.values()].sort((left, right) => {
    const leftWindows = [...left.browseTimeWindows, ...left.createTimeWindows];
    const rightWindows = [...right.browseTimeWindows, ...right.createTimeWindows];
    const leftRecordStart = Math.min(
      ...left.listRecords.map((record) => resolvePRDiscoveryTimeWindowStartTimestamp(record.time)),
    );
    const rightRecordStart = Math.min(
      ...right.listRecords.map((record) => resolvePRDiscoveryTimeWindowStartTimestamp(record.time)),
    );
    const leftStart = Math.min(
      leftRecordStart,
      ...leftWindows.map((entry) => resolvePRDiscoveryTimeWindowStartTimestamp(entry.timeWindow)),
    );
    const rightStart = Math.min(
      rightRecordStart,
      ...rightWindows.map((entry) => resolvePRDiscoveryTimeWindowStartTimestamp(entry.timeWindow)),
    );
    return leftStart - rightStart || left.key.localeCompare(right.key);
  });

  const expiredDateGroups = sortedGroups
    .filter(
      (group) =>
        group.isExpiredDate && group.listRecords.some((record) => record.status === "CLOSED"),
    )
    .slice(-3);
  const currentAndFutureGroups = sortedGroups.filter(
    (group) =>
      !group.isExpiredDate &&
      (group.createTimeWindows.length > 0 ||
        group.listRecords.some(
          (record) =>
            record.status === "OPEN" || record.status === "READY" || record.status === "ACTIVE",
        )),
  );
  return [...expiredDateGroups, ...currentAndFutureGroups];
});

const dateKeys = computed(() => dateGroups.value.map((group) => group.key));
const dateTabs = computed<DateTabItem[]>(() =>
  dateKeys.value.map((key) => ({ value: key, label: formatPRDiscoveryDateKeyLabel(key) })),
);

const resolveDefaultDateKey = (groups: readonly DateGroup[]): string | null => {
  const currentAndFutureGroups = groups.filter((group) => !group.isExpiredDate);
  const firstUpcomingGroup = currentAndFutureGroups.find((group) =>
    [
      ...group.browseTimeWindows.map((entry) => entry.timeWindow),
      ...group.createTimeWindows.map((entry) => entry.timeWindow),
      ...group.listRecords.map((record) => record.time),
    ].some((timeWindow) => !isEndedPRDiscoveryTimeWindow(timeWindow)),
  );
  if (firstUpcomingGroup) return firstUpcomingGroup.key;
  return currentAndFutureGroups[0]?.key ?? groups[groups.length - 1]?.key ?? null;
};
watch(
  dateGroups,
  (groups) => {
    if (groups.length === 0) {
      selectedDateKey.value = null;
      return;
    }
    if (
      selectedDateKey.value !== null &&
      groups.some((group) => group.key === selectedDateKey.value)
    ) {
      return;
    }
    selectedDateKey.value = resolveDefaultDateKey(groups);
  },
  { immediate: true },
);

const visibleListItems = computed<VisibleListItem[]>(() => {
  const dateKey = selectedDateKey.value;
  if (!dateKey) return [];
  const group = dateGroups.value.find((entry) => entry.key === dateKey);
  if (!group) return [];
  const persisted: VisiblePersistedItem[] = listRecordsForView.value.flatMap((record, index) => {
    if (resolvePRDiscoveryTimeWindowDateKey(record.time) !== dateKey) return [];
    const visibleStatus = group.isExpiredDate
      ? record.status === "CLOSED"
      : record.status === "OPEN" || record.status === "READY" || record.status === "ACTIVE";
    if (!visibleStatus) return [];
    return [
      {
        kind: "persisted",
        key: "persisted:" + record.prId,
        dateKey,
        record,
        timeLabel: formatPRDiscoveryTimeWindowTimeLabel(
          record.time,
          index,
          t("prDiscovery.card.batchLabel"),
        ),
      },
    ];
  });
  const transient: VisibleSuggestionItem[] = allSuggestions.value.flatMap((suggestion, index) => {
    if (suggestion.dateKey !== dateKey) return [];
    return [
      {
        kind: "suggestion",
        key: suggestion.key,
        dateKey,
        suggestion,
        timeLabel: formatPRDiscoveryTimeWindowTimeLabel(
          suggestion.timeWindow,
          index,
          t("prDiscovery.card.batchLabel"),
        ),
      },
    ];
  });
  return [...persisted, ...transient].sort((left, right) => {
    const leftWindow = left.kind === "persisted" ? left.record.time : left.suggestion.timeWindow;
    const rightWindow =
      right.kind === "persisted" ? right.record.time : right.suggestion.timeWindow;
    return (
      resolvePRDiscoveryTimeWindowStartTimestamp(leftWindow) -
        resolvePRDiscoveryTimeWindowStartTimestamp(rightWindow) || left.key.localeCompare(right.key)
    );
  });
});

const allPoiIdsCsv = computed(() => {
  const ids = new Set<string>();
  for (const candidate of props.candidates) {
    const location = candidate.location?.trim();
    if (location) ids.add(location);
  }
  for (const record of listRecordsForView.value) {
    const location = record.location?.trim();
    if (location) ids.add(location);
  }
  for (const option of activeCreatePlaceOptions.value) {
    if (option.kind === "location" && option.locationId.trim()) ids.add(option.locationId.trim());
  }
  return ids.size > 0 ? [...ids].join(",") : null;
});
const { data: discoveryPois } = usePoisByIds(allPoiIdsCsv);
const poiGalleryById = computed(() => toPoiGalleryMap(discoveryPois.value ?? []));
const resolveCoverImage = (location: string | null): string | null => {
  const normalized = location?.trim();
  if (!normalized) return props.typeDetail?.coverImage ?? null;
  return (
    pickRandomPoiGalleryImage(poiGalleryById.value.get(normalized) ?? []) ??
    props.typeDetail?.coverImage ??
    null
  );
};

const isListExhausted = computed(() => props.exhausted && visibleListItems.value.length === 0);
const hasBrowseItemInSelectedDate = computed(() => visibleListItems.value.length > 0);
const createCardTitle = computed(() =>
  hasBrowseItemInSelectedDate.value
    ? t("prDiscovery.createCard.title")
    : t("prDiscovery.createCard.titleWhenNoAvailablePR"),
);
const shouldAutoExpandCreateCard = computed(
  () =>
    props.showCreate &&
    !hasBrowseItemInSelectedDate.value &&
    (createTimeWindows.value.length > 0 || allPlaceOptions.value.length > 0),
);
const shouldAutoExpandCommunityCard = computed(
  () => !props.showCreate && communityQrCode.value !== null,
);
const createCardAutoExpandContextKey = computed(
  () => props.type + ":" + (selectedDateKey.value ?? "none"),
);
const communityCardAutoExpandContextKey = computed(
  () => (selectedDateKey.value ?? "none") + ":" + (communityQrCode.value ?? "none"),
);
const isCreateDisabled = computed(
  () =>
    props.pending ||
    selectedCreateTimeWindow.value?.[0] == null ||
    selectedCreateTimeWindow.value?.[1] == null ||
    !activeCreatePlaceOptions.value.some((option) => !option.disabled),
);

const handleDateTabChange = (value: string | number) => {
  selectedDateKey.value = String(value);
};
const handleSuggestionCreate = (suggestion: PRDiscoveryCreationSuggestion) => {
  if (!props.showCreate || props.pending) return;
  const command = buildPRDiscoverySuggestionCreateCommand(suggestion);
  if (!command) return;
  emit("create-suggestion", suggestion);
  emit("create-direct", command);
};
const handleCreate = (place: PRDiscoveryPlaceSelection | null) => {
  if (!props.showCreate || props.pending) return;
  const command = buildPRDiscoveryDirectCreateCommand({
    timeWindow: selectedCreateTimeWindow.value,
    place,
    preferences: [],
    allowEditAfterReady: selectedCreateAllowEditAfterReady.value,
  });
  if (command) emit("create-direct", command);
};
const handleOpenType = (payload: { type: string }) => emit("open-type", payload.type);
</script>

<style lang="scss" scoped>
.date-section {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  min-height: 0;
  margin-bottom: 1rem;
}

.date-panel {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.pr-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-small) + var(--sys-spacing-xsmall));
}

.batch-action-cards {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  margin-top: auto;
  padding-top: var(--sys-spacing-medium);
}

.state-action-link {
  @include mx.pu-font(control);
  width: fit-content;
  color: var(--sys-color-primary);
  text-decoration: none;
}
</style>
