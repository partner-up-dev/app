<template>
  <div v-if="isLoading" class="loading-state">
    {{ t("common.loading") }}
  </div>

  <div v-else-if="isError" class="error-state">
    {{ t("anchorEvent.loadFailed") }}
    <router-link :to="{ name: 'event-plaza' }" class="back-link">
      {{ t("anchorEvent.backToPlaza") }}
    </router-link>
  </div>

  <div
    v-else-if="detail"
    class="date-section"
    data-testid="anchor-event-list-mode.surface"
  >
    <TabBar
      v-if="dateTabs.length > 0"
      :items="dateTabs"
      :model-value="selectedDateKey ?? 'none'"
      :aria-label="t('anchorEvent.dateLabel')"
      @update:model-value="handleDateTabChange"
    />

    <div class="date-content" role="tabpanel">
      <div
        class="batch-list"
        data-region="pr-list"
        data-testid="anchor-event-list-mode.pr-list"
      >
        <div v-if="visibleListItems.length > 0" class="pr-list">
          <template v-for="item in visibleListItems" :key="item.key">
            <PRPreviewCard
              v-if="item.kind === 'real'"
              :pr-id="item.pr.id"
              :to="buildPrDetailRoute(item.pr.id)"
              :time-label="item.timeLabel"
              :cover-image="resolveCoverImage(item.pr.location)"
              @open-detail="trackListPrRowAction(item)"
            />
            <EventDummyPRCard
              v-else
              :title="eventTitle"
              :time-label="item.timeLabel"
              :display-location-name="item.dummy.displayLocationName"
              :place-icon="item.dummy.place.kind === 'route' ? '🧭' : '📍'"
              :preference-tags="item.dummy.preferenceTags"
              :max-partners="detail.defaultMaxPartners"
              :cover-image="resolveCoverImage(item.dummy.displayLocationName)"
              :pending="isCreatePending"
              :disabled="!canUserCreatePR"
              data-testid="anchor-event-list-mode.dummy-pr"
              @open-detail="handleOpenDummyDetailInList(item)"
            />
          </template>
        </div>
        <p v-if="listDummyCreateErrorMessage" class="list-create-error">
          {{ listDummyCreateErrorMessage }}
        </p>
        <article
          v-else-if="isListExhausted"
          class="list-exhausted-card"
          data-region="exhausted-card"
        >
          <p class="list-exhausted-card__title">
            {{ t("anchorEvent.exhausted") }}
          </p>
          <p class="list-exhausted-card__body">
            {{ t("anchorEvent.subscribeHint") }}
          </p>
          <router-link
            :to="{ name: 'event-plaza' }"
            class="list-exhausted-card__link"
          >
            {{ t("anchorEvent.discoverOthers") }}
          </router-link>
        </article>
        <div v-else class="empty-batch">
          {{
            hasBrowseTimeWindows
              ? t("anchorEvent.noPRsInSelectedDate")
              : t("anchorEvent.noBatches")
          }}
        </div>
      </div>

      <div class="batch-action-cards">
        <EventPRCreateCard
          v-if="canUserCreatePR"
          :title="createCardTitle"
          :event-id="eventIdValue"
          :event-title="eventTitle"
          :time-window="selectedCreateTimeWindow"
          :allow-edit-after-ready="selectedCreateAllowEditAfterReady"
          :place-options="createTimeWindowPlaceOptions"
          :place-label="createTimeWindowPlaceLabel"
          :place-placeholder="createTimeWindowPlacePlaceholder"
          :default-expanded="shouldAutoExpandCreateCard"
          :auto-expand-context-key="createCardAutoExpandContextKey"
          :pending="isCreatePending"
          :disabled="isCreateDisabled"
          :error-message="resolvedCreateActionErrorMessage"
          @update:time-window="selectedCreateTimeWindow = $event"
          @update:allow-edit-after-ready="
            selectedCreateAllowEditAfterReady = $event
          "
          @create="handleCreateInList"
          data-region="create-pr"
        />
        <AnchorEventBetaGroupCard
          v-if="eventBetaGroupQrCode !== null"
          :event-id="eventIdValue"
          :event-title="eventTitle"
          :qr-code-url="eventBetaGroupQrCode"
          :default-expanded="shouldAutoExpandBetaGroupCard"
          :auto-expand-context-key="betaGroupCardAutoExpandContextKey"
          variant="list"
        />
        <OtherAnchorEventsSection
          :current-event-id="eventIdValue"
          variant="panel"
          data-region="discover-other-events"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import TabBar from "@/shared/ui/navigation/TabBar.vue";
import PRPreviewCard from "@/domains/pr/ui/primitives/PRPreviewCard.vue";
import EventPRCreateCard from "@/domains/event/ui/primitives/EventPRCreateCard.vue";
import EventDummyPRCard from "@/domains/event/ui/primitives/EventDummyPRCard.vue";
import AnchorEventBetaGroupCard from "@/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue";
import OtherAnchorEventsSection from "@/domains/event/ui/sections/OtherAnchorEventsSection.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import {
  formatDateKeyLabel,
  formatTimeWindowLabel,
  formatTimeWindowTimeLabel,
  hasTimeWindowStarted,
  isEndedTimeWindow,
  resolveTimeWindowDateKey,
  resolveTimeWindowStartTimestamp,
  type TimeWindow,
} from "@/domains/event/model/time-window-view";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";
import {
  pickRandomPoiGalleryImage,
  toPoiGalleryMap,
} from "@/domains/event/model/poi-gallery";
import { useEventAssistedPRCreateFlow } from "@/domains/event/use-cases/useEventAssistedPRCreateFlow";
import {
  getTodayProductLocalDateKey,
  isProductLocalDateKey,
  type ProductLocalDateKey,
} from "@/shared/datetime/productLocalDate";
import {
  buildCreateTimeWindowPlaceOptions,
  getExclusiveCreateTimeWindowLocationOptions,
  type AnchorEventSelectedPlace,
} from "@/domains/event/model/place-options";
import {
  buildAnchorEventDummyPRs,
  type AnchorEventDummyPR,
} from "@/domains/event/model/dummy-prs";
import { trackEvent } from "@/shared/telemetry/track";

type DateTabItem = {
  key: string;
  label: string;
  tabClass?: string;
};

type AnchorEventTimeWindow =
  AnchorEventDetailResponse["browseTimeWindows"][number];
type CreateTimeWindow = AnchorEventDetailResponse["createTimeWindows"][number];
type AnchorEventTimeWindowPR = AnchorEventTimeWindow["prs"][number];

type DateGroupTimeWindowItem = {
  entry: AnchorEventTimeWindow;
  timeLabel: string;
};

type DateGroup = {
  key: string;
  label: string;
  isExpiredDate: boolean;
  tabClass?: string;
  timeWindows: DateGroupTimeWindowItem[];
};

type VisiblePRItem = {
  kind: "real";
  key: string;
  timeWindowKey: string;
  dateKey: string;
  pr: AnchorEventTimeWindowPR;
  timeLabel: string;
  timeWindowStart: string | null;
  rowRank: number;
};

type VisibleDummyItem = {
  kind: "dummy";
  key: string;
  dateKey: string;
  dummy: AnchorEventDummyPR;
  timeLabel: string;
  timeWindowStart: string | null;
  rowRank: number;
};

type VisibleListItem = VisiblePRItem | VisibleDummyItem;

type CreateTimeWindowChoice = {
  entry: CreateTimeWindow;
};

const props = defineProps<{
  eventId: number;
}>();

const { t } = useI18n();
const eventId = computed<number | null>(() => props.eventId);
const eventIdValue = computed(() => props.eventId);
const selectedCreateTimeWindow = ref<TimeWindow | null>(null);
const selectedCreateAllowEditAfterReady =
  ref<PRAllowEditAfterReady | null>(null);
const selectedDateKey = ref<string | null>(null);
const activeListTelemetryContextKey = ref<string | null>(null);
const trackedListTelemetryKeys = ref<Set<string>>(new Set());

const {
  data: detail,
  isLoading,
  isError,
} = useAnchorEventDetail(eventId);
const eventDetail = computed(() => detail.value ?? null);
const {
  createEventAssistedPR,
  createActionErrorMessage,
  isCreatePending,
} = useEventAssistedPRCreateFlow(eventDetail);

const eventTitle = computed(() => detail.value?.title ?? "");
const eventBetaGroupQrCode = computed(() => detail.value?.betaGroupQrCode ?? null);
const hasBrowseTimeWindows = computed(
  () => (detail.value?.browseTimeWindows.length ?? 0) > 0,
);
const isListExhausted = computed(() => detail.value?.exhausted === true);
const canUserCreatePR = computed(() => detail.value?.canUserCreatePR === true);

const buildListFunnelPayload = () => ({
  eventId: props.eventId,
  activityType: detail.value?.type,
});

const claimListTelemetryKey = (key: string): boolean => {
  if (trackedListTelemetryKeys.value.has(key)) return false;
  trackedListTelemetryKeys.value.add(key);
  return true;
};

const ensureListTelemetryContext = (): void => {
  const contextKey = props.eventId.toString();
  if (activeListTelemetryContextKey.value === contextKey) return;
  activeListTelemetryContextKey.value = contextKey;
  trackedListTelemetryKeys.value = new Set();
};

const buildPrDetailRoute = (prId: number): string =>
  `/pr/${prId}?fromEvent=${props.eventId}`;

const LIST_MODE_EXPIRED_DATE_LIMIT = 3;
const LIST_MODE_EXPIRED_TAB_CLASS = "tab-bar__tab--expired";

const sortedBrowseTimeWindows = computed(() => {
  const timeWindows = detail.value?.browseTimeWindows ?? [];
  return [...timeWindows].sort((left, right) => {
    const leftTimestamp = resolveTimeWindowStartTimestamp(left.timeWindow);
    const rightTimestamp = resolveTimeWindowStartTimestamp(right.timeWindow);
    return leftTimestamp - rightTimestamp;
  });
});

const sortedCreateTimeWindows = computed(() => {
  const timeWindows = detail.value?.createTimeWindows ?? [];
  return [...timeWindows].sort((left, right) => {
    const leftTimestamp = resolveTimeWindowStartTimestamp(left.timeWindow);
    const rightTimestamp = resolveTimeWindowStartTimestamp(right.timeWindow);
    return leftTimestamp - rightTimestamp;
  });
});

const upcomingSortedCreateTimeWindows = computed(() =>
  sortedCreateTimeWindows.value.filter(
    (entry) => !hasTimeWindowStarted(entry.timeWindow),
  ),
);

const isExpiredDateGroupKey = (
  groupKey: string,
  todayDateKey: string,
): boolean =>
  isProductLocalDateKey(groupKey) &&
  groupKey < todayDateKey;

const isClosedPR = (pr: AnchorEventTimeWindowPR): boolean =>
  pr.status === "CLOSED";

const isCurrentOrFutureVisiblePR = (pr: AnchorEventTimeWindowPR): boolean =>
  pr.status === "OPEN" || pr.status === "READY" || pr.status === "ACTIVE";

const dateGroupHasClosedPR = (group: DateGroup): boolean =>
  group.timeWindows.some(({ entry }) => entry.prs.some(isClosedPR));

const toVisibleListModeDateGroups = (groups: DateGroup[]): DateGroup[] => {
  const expiredDateGroups = groups
    .filter((group) => group.isExpiredDate && dateGroupHasClosedPR(group))
    .slice(-LIST_MODE_EXPIRED_DATE_LIMIT);
  const currentAndFutureGroups = groups.filter((group) => !group.isExpiredDate);

  return [...expiredDateGroups, ...currentAndFutureGroups];
};

const dateGroups = computed<DateGroup[]>(() => {
  const groups: DateGroup[] = [];
  const groupIndexByKey = new Map<string, number>();
  const todayDateKey = getTodayProductLocalDateKey();

  sortedBrowseTimeWindows.value.forEach((entry, index) => {
    const groupKey =
      resolveTimeWindowDateKey(entry.timeWindow) ?? `time-window:${entry.key}`;
    const existingIndex = groupIndexByKey.get(groupKey);
    const timeWindowViewModel: DateGroupTimeWindowItem = {
      entry,
      timeLabel: formatTimeWindowTimeLabel(
        entry.timeWindow,
        index,
        t("anchorEvent.batchLabel"),
      ),
    };

    if (existingIndex !== undefined) {
      groups[existingIndex]?.timeWindows.push(timeWindowViewModel);
      return;
    }

    const groupLabel = groupKey.startsWith("time-window:")
      ? formatTimeWindowLabel(
          entry.timeWindow,
          index,
          t("anchorEvent.batchLabel"),
        )
      : formatDateKeyLabel(groupKey as ProductLocalDateKey);
    const isExpiredDate = isExpiredDateGroupKey(groupKey, todayDateKey);

    groupIndexByKey.set(groupKey, groups.length);
    groups.push({
      key: groupKey,
      label: groupLabel,
      isExpiredDate,
      tabClass: isExpiredDate ? LIST_MODE_EXPIRED_TAB_CLASS : undefined,
      timeWindows: [timeWindowViewModel],
    });
  });

  upcomingSortedCreateTimeWindows.value.forEach((entry, index) => {
    const groupKey =
      resolveTimeWindowDateKey(entry.timeWindow) ?? `create-window:${entry.key}`;
    if (groupIndexByKey.has(groupKey)) {
      return;
    }

    const groupLabel = groupKey.startsWith("create-window:")
      ? formatTimeWindowLabel(
          entry.timeWindow,
          index,
          t("anchorEvent.batchLabel"),
        )
      : formatDateKeyLabel(groupKey as ProductLocalDateKey);
    const isExpiredDate = isExpiredDateGroupKey(groupKey, todayDateKey);

    groupIndexByKey.set(groupKey, groups.length);
    groups.push({
      key: groupKey,
      label: groupLabel,
      isExpiredDate,
      tabClass: isExpiredDate ? LIST_MODE_EXPIRED_TAB_CLASS : undefined,
      timeWindows: [],
    });
  });

  return toVisibleListModeDateGroups(groups).map((group) => ({
    ...group,
    tabClass: group.isExpiredDate ? LIST_MODE_EXPIRED_TAB_CLASS : undefined,
  }));
});

const dateTabs = computed<DateTabItem[]>(() =>
  dateGroups.value.map((group) => ({
    key: group.key,
    label: group.label,
    tabClass: group.tabClass,
  })),
);

const createTimeWindowChoices = computed<CreateTimeWindowChoice[]>(() =>
  upcomingSortedCreateTimeWindows.value.map((entry) => ({
    entry,
  })),
);

const selectedDateGroup = computed(
  () =>
    dateGroups.value.find((group) => group.key === selectedDateKey.value) ??
    null,
);

const resolveDefaultDateKey = (groups: DateGroup[]): string | null => {
  const firstUpcomingGroup = groups.find(
    (group) =>
      !group.isExpiredDate &&
      group.timeWindows.some(
        ({ entry }) => !isEndedTimeWindow(entry.timeWindow),
      ),
  );
  if (firstUpcomingGroup) {
    return firstUpcomingGroup.key;
  }

  const firstCurrentOrFutureGroup = groups.find(
    (group) => !group.isExpiredDate,
  );
  if (firstCurrentOrFutureGroup) {
    return firstCurrentOrFutureGroup.key;
  }

  return groups[groups.length - 1]?.key ?? null;
};

watch(
  dateGroups,
  (groups) => {
    if (groups.length === 0) {
      selectedDateKey.value = null;
      return;
    }

    if (selectedDateKey.value !== null) {
      const matched = groups.some(
        (group) => group.key === selectedDateKey.value,
      );
      if (matched) {
        return;
      }
    }

    selectedDateKey.value = resolveDefaultDateKey(groups);
  },
  { immediate: true },
);

const allPoiIdsCsv = computed(() => {
  const uniqueLocationIds = new Set<string>();

  for (const entry of sortedBrowseTimeWindows.value) {
    for (const pr of entry.prs) {
      const location = pr.location?.trim() ?? "";
      if (location.length > 0) {
        uniqueLocationIds.add(location);
      }
    }
  }
  for (const entry of sortedCreateTimeWindows.value) {
    for (const option of getExclusiveCreateTimeWindowLocationOptions(entry)) {
      const locationId = option.locationId.trim();
      if (locationId.length > 0) {
        uniqueLocationIds.add(locationId);
      }
    }
  }
  for (const option of detail.value?.placeSelector.options ?? []) {
    if (option.kind !== "location") {
      continue;
    }

    const locationId = option.locationId.trim();
    if (locationId.length > 0) {
      uniqueLocationIds.add(locationId);
    }
  }

  if (uniqueLocationIds.size === 0) {
    return null;
  }

  return Array.from(uniqueLocationIds).join(",");
});

const { data: eventPois } = usePoisByIds(allPoiIdsCsv);
const poiGalleryById = computed(() => toPoiGalleryMap(eventPois.value ?? []));
const poiByName = computed(
  () => new Map((eventPois.value ?? []).map((poi) => [poi.name, poi])),
);

const resolveCoverImage = (location: string | null): string | null => {
  if (!location) {
    return null;
  }

  const normalized = location.trim();
  if (!normalized) {
    return null;
  }

  return pickRandomPoiGalleryImage(poiGalleryById.value.get(normalized) ?? []);
};

const dummyPRs = computed(() =>
  detail.value
    ? buildAnchorEventDummyPRs({
        browseTimeWindows: detail.value.browseTimeWindows,
        createTimeWindows: detail.value.createTimeWindows,
        presetTags: detail.value.presetTags,
        poiByName: poiByName.value,
      })
    : [],
);

const isVisibleListModePR = (
  pr: AnchorEventTimeWindowPR,
  group: DateGroup,
): boolean =>
  group.isExpiredDate ? isClosedPR(pr) : isCurrentOrFutureVisiblePR(pr);

const resolveVisibleDummyItemsForGroup = (
  group: DateGroup,
): VisibleDummyItem[] =>
  dummyPRs.value
    .filter((dummy) => dummy.dateKey === group.key)
    .map((dummy, index) => ({
      kind: "dummy",
      key: dummy.key,
      dateKey: group.key,
      dummy,
      timeLabel: formatTimeWindowTimeLabel(
        dummy.timeWindow,
        index,
        t("anchorEvent.batchLabel"),
      ),
      timeWindowStart: dummy.timeWindowStart,
      rowRank: index + 1,
    }));

const resolveVisiblePRItemsForGroup = (group: DateGroup): VisiblePRItem[] => {
  const items: VisiblePRItem[] = [];

  for (const timeWindowItem of group.timeWindows) {
    for (const pr of timeWindowItem.entry.prs.filter((entry) =>
      isVisibleListModePR(entry, group),
    )) {
      items.push({
        kind: "real",
        key: `real:${timeWindowItem.entry.key}:${pr.id}`,
        timeWindowKey: timeWindowItem.entry.key,
        dateKey: group.key,
        pr,
        timeLabel: timeWindowItem.timeLabel,
        timeWindowStart: timeWindowItem.entry.timeWindow[0] ?? null,
        rowRank: items.length + 1,
      });
    }
  }

  return items;
};

const visiblePRItems = computed<VisiblePRItem[]>(() => {
  const group = selectedDateGroup.value;
  return group ? resolveVisiblePRItemsForGroup(group) : [];
});

const visibleListItems = computed<VisibleListItem[]>(() => {
  const group = selectedDateGroup.value;
  if (!group) {
    return [];
  }

  return [
    ...resolveVisiblePRItemsForGroup(group),
    ...resolveVisibleDummyItemsForGroup(group),
  ].sort((left, right) => {
    const leftTimestamp =
      left.kind === "real"
        ? resolveTimeWindowStartTimestamp(left.pr.time)
        : resolveTimeWindowStartTimestamp(left.dummy.timeWindow);
    const rightTimestamp =
      right.kind === "real"
        ? resolveTimeWindowStartTimestamp(right.pr.time)
        : resolveTimeWindowStartTimestamp(right.dummy.timeWindow);

    return leftTimestamp - rightTimestamp || left.key.localeCompare(right.key);
  });
});

const listLoadedCounts = computed(() => {
  let visiblePrCount = 0;
  let currentFuturePrCount = 0;
  let expiredPrCount = 0;

  for (const group of dateGroups.value) {
    const groupItems = resolveVisiblePRItemsForGroup(group);
    visiblePrCount += groupItems.length;
    if (group.isExpiredDate) {
      expiredPrCount += groupItems.length;
    } else {
      currentFuturePrCount += groupItems.length;
    }
  }

  return {
    dateCount: dateGroups.value.length,
    visiblePrCount,
    currentFuturePrCount,
    expiredPrCount,
  };
});

watch(
  [detail, dateGroups],
  ([event]) => {
    if (!event) return;
    ensureListTelemetryContext();
    const counts = listLoadedCounts.value;
    if (
      !claimListTelemetryKey(
        [
          "anchor_event.list.loaded",
          props.eventId,
          counts.dateCount,
          counts.visiblePrCount,
          counts.currentFuturePrCount,
          counts.expiredPrCount,
        ].join(":"),
      )
    ) {
      return;
    }

    trackEvent("anchor_event_list_loaded", {
      ...buildListFunnelPayload(),
      ...counts,
    });
  },
  { immediate: true },
);

watch(
  visiblePRItems,
  (items) => {
    ensureListTelemetryContext();
    for (const item of items) {
      if (
        !claimListTelemetryKey(
          `anchor_event.pr_row.seen:${props.eventId}:${item.dateKey}:${item.timeWindowKey}:${item.pr.id}`,
        )
      ) {
        continue;
      }

      trackEvent("anchor_event_list_pr_row_seen", {
        ...buildListFunnelPayload(),
        prId: item.pr.id,
        timeWindowStart: item.timeWindowStart,
        locationId: item.pr.location,
        rowRank: item.rowRank,
        dateKey: item.dateKey,
      });
    }
  },
  { immediate: true },
);

const timeWindowsEqual = (
  left: TimeWindow | null | undefined,
  right: TimeWindow | null | undefined,
): boolean =>
  (left?.[0] ?? null) === (right?.[0] ?? null) &&
  (left?.[1] ?? null) === (right?.[1] ?? null);

const selectedTimeWindowEntry = computed(() => {
  if (selectedCreateTimeWindow.value === null) {
    return null;
  }

  return (
    createTimeWindowChoices.value.find(
      ({ entry }) => timeWindowsEqual(entry.timeWindow, selectedCreateTimeWindow.value),
    )?.entry ?? null
  );
});

const activeCreatePlaceSelector = computed(
  () => selectedTimeWindowEntry.value?.placeSelector ?? detail.value?.placeSelector ?? null,
);

const createTimeWindowPlaceOptions = computed(() =>
  buildCreateTimeWindowPlaceOptions({
    placeSelector: activeCreatePlaceSelector.value,
    locationOptions: selectedTimeWindowEntry.value?.locationOptions ?? [],
    routeOptions: selectedTimeWindowEntry.value?.routeOptions ?? [],
    poiByName: poiByName.value,
  }),
);
const createTimeWindowPlaceLabel = computed(() =>
  t(
    activeCreatePlaceSelector.value?.labelKey ??
      "anchorEvent.placeSelector.locationLabel",
  ),
);
const createTimeWindowPlacePlaceholder = computed(() =>
  t(
    activeCreatePlaceSelector.value?.placeholderKey ??
      "anchorEvent.placeSelector.locationPlaceholder",
  ),
);

const hasCompleteCreateTimeWindow = computed(
  () =>
    selectedCreateTimeWindow.value !== null &&
    selectedCreateTimeWindow.value[0] !== null &&
    selectedCreateTimeWindow.value[1] !== null,
);

const createCardValidationMessage = computed(() => {
  if (!hasCompleteCreateTimeWindow.value) {
    return t("anchorEvent.createCard.errors.missingTimeWindow");
  }

  if (!createTimeWindowPlaceOptions.value.some((option) => !option.disabled)) {
    return t("anchorEvent.createCard.errors.missingPlace");
  }

  return null;
});
const resolvedCreateActionErrorMessage = computed(
  () => createActionErrorMessage.value ?? createCardValidationMessage.value,
);
const listDummyCreateErrorMessage = computed(
  () => createActionErrorMessage.value,
);
const isCreateDisabled = computed(
  () => isCreatePending.value || createCardValidationMessage.value !== null,
);

const hasBrowseItemInSelectedDate = computed(
  () => visibleListItems.value.length > 0,
);

const createCardTitle = computed(() => {
  if (hasBrowseItemInSelectedDate.value) {
    return t("anchorEvent.createCard.title");
  }

  return t("anchorEvent.createCard.titleWhenNoAvailablePR");
});

const shouldAutoExpandCreateCard = computed(() => {
  if (
    createTimeWindowChoices.value.length === 0 &&
    createTimeWindowPlaceOptions.value.length === 0
  ) {
    return false;
  }

  return canUserCreatePR.value && !hasBrowseItemInSelectedDate.value;
});

const shouldAutoExpandBetaGroupCard = computed(
  () =>
    detail.value?.prCreationPolicy === "ADMIN_ONLY" &&
    eventBetaGroupQrCode.value !== null &&
    !hasBrowseItemInSelectedDate.value,
);

const createCardAutoExpandContextKey = computed(
  () => `${eventIdValue.value}:${selectedDateKey.value ?? "none"}`,
);

const betaGroupCardAutoExpandContextKey = computed(
  () =>
    `${selectedDateKey.value ?? "none"}:${eventBetaGroupQrCode.value ?? "none"}`,
);

const handleDateTabChange = (value: string | number) => {
  const dateKey = String(value);
  selectedDateKey.value = dateKey;
  const group = dateGroups.value.find((item) => item.key === dateKey) ?? null;
  if (!group) return;

  trackEvent("anchor_event_list_date_selected", {
    ...buildListFunnelPayload(),
    dateKey,
    isExpiredDate: group.isExpiredDate,
    visiblePrCount: resolveVisiblePRItemsForGroup(group).length,
  });
};

const trackListPrRowAction = (item: VisiblePRItem): void => {
  trackEvent("anchor_event_list_pr_row_action_taken", {
    ...buildListFunnelPayload(),
    prId: item.pr.id,
    rowRank: item.rowRank,
    dateKey: item.dateKey,
  });
  trackEvent("pr_entry_reached", {
    ...buildListFunnelPayload(),
    prId: item.pr.id,
    entrySurface: "list_mode",
    entryType: "detail",
  });
};

const handleCreateInList = async (place: AnchorEventSelectedPlace | null) => {
  if (!canUserCreatePR.value) {
    return;
  }
  if (createCardValidationMessage.value !== null) {
    return;
  }

  trackEvent("anchor_event_list_create_started", {
    ...buildListFunnelPayload(),
    dateKey: selectedDateKey.value,
    locationId: place?.kind === "location" ? place.locationId : null,
    routePoolEntryId: place?.kind === "route" ? place.routePoolEntryId : null,
    placeKind: place?.kind ?? null,
    timeWindowStart: selectedCreateTimeWindow.value?.[0] ?? null,
  });
  await createEventAssistedPR({
    targetTimeWindow: selectedCreateTimeWindow.value,
    allowEditAfterReady: selectedCreateAllowEditAfterReady.value,
    place,
    entrySurface: "list_mode",
  });
};

const handleOpenDummyDetailInList = async (item: VisibleDummyItem) => {
  if (!canUserCreatePR.value || isCreatePending.value) {
    return;
  }

  trackEvent("anchor_event_list_create_started", {
    ...buildListFunnelPayload(),
    dateKey: item.dateKey,
    locationId:
      item.dummy.place.kind === "location"
        ? item.dummy.place.locationId
        : null,
    routePoolEntryId:
      item.dummy.place.kind === "route"
        ? item.dummy.place.routePoolEntryId
        : null,
    placeKind: item.dummy.place.kind,
    timeWindowStart: item.dummy.timeWindowStart,
    preferenceCount: item.dummy.preferenceTags.length,
  });

  await createEventAssistedPR({
    targetTimeWindow: item.dummy.timeWindow,
    place: item.dummy.place,
    preferences: item.dummy.preferenceTags,
    entrySurface: "list_mode",
  });
};
</script>

<style lang="scss" scoped>
.date-section {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 1rem;
}

.date-section :deep(.tab-bar) {
  margin-bottom: 1rem;
}

.date-content {
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

.empty-state,
.empty-batch {
  text-align: center;
  padding: calc(var(--sys-spacing-large) + var(--sys-spacing-medium)) 0;
  color: var(--sys-color-on-surface-variant);
}

.list-exhausted-card {
  display: grid;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}

.list-exhausted-card__title,
.list-exhausted-card__body {
  margin: 0;
}

.list-exhausted-card__title {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.list-exhausted-card__body {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.list-exhausted-card__link {
  @include mx.pu-font(control);
  justify-self: start;
  color: var(--sys-color-primary);
  text-decoration: none;
}

.list-create-error {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-error);
}

.loading-state,
.error-state {
  text-align: center;
  padding: var(--sys-spacing-large) 0;
  color: var(--sys-color-on-surface-variant);
}

.back-link {
  display: block;
  margin-top: var(--sys-spacing-small);
  color: var(--sys-color-primary);
  text-decoration: none;
}
</style>
