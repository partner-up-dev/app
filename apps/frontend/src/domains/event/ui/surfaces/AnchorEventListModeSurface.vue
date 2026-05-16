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
        <div v-if="visiblePRItems.length > 0" class="pr-list">
          <PRPreviewCard
            v-for="item in visiblePRItems"
            :key="`${item.timeWindowKey}:${item.pr.id}`"
            :pr-id="item.pr.id"
            :to="buildPrDetailRoute(item.pr.id)"
            :time-label="item.timeLabel"
            :cover-image="resolveCoverImage(item.pr.location)"
            @open-detail="trackListPrRowAction(item)"
          />
        </div>
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
          :time-window-label="createCardSubtitleTimeLabel"
          :event-title="eventTitle"
          :time-window-options="createTimeWindowOptions"
          :selected-time-window-key="selectedTimeWindowKey"
          :location-options="createTimeWindowLocationOptions"
          :default-expanded="shouldAutoExpandCreateCard"
          :auto-expand-context-key="createCardAutoExpandContextKey"
          :pending="isCreatePending"
          :error-message="createActionErrorMessage"
          @update:selected-time-window-key="handleSelectedTimeWindowChange"
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
import TabBar from "@/shared/ui/navigation/TabBar.vue";
import PRPreviewCard from "@/domains/pr/ui/primitives/PRPreviewCard.vue";
import EventPRCreateCard from "@/domains/event/ui/primitives/EventPRCreateCard.vue";
import AnchorEventBetaGroupCard from "@/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue";
import OtherAnchorEventsSection from "@/domains/event/ui/sections/OtherAnchorEventsSection.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import {
  formatDateKeyLabel,
  formatTimeWindowLabel,
  formatTimeWindowOptionLabel,
  formatTimeWindowTimeLabel,
  hasTimeWindowStarted,
  isEndedTimeWindow,
  resolveTimeWindowDateKey,
  resolveTimeWindowStartTimestamp,
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
import { trackEvent } from "@/shared/telemetry/track";
import { claimUserTelemetrySegmentDedupeKey } from "@/shared/telemetry/journey";

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
  timeWindowKey: string;
  dateKey: string;
  pr: AnchorEventTimeWindowPR;
  timeLabel: string;
  timeWindowStart: string | null;
  rowRank: number;
};

type CreateTimeWindowChoice = {
  entry: CreateTimeWindow;
  optionLabel: string;
  subtitleLabel: string;
};

const props = defineProps<{
  eventId: number;
}>();

const emit = defineEmits<{
  "header-context": [
    context: {
      title: string;
      subtitle: string | null;
    } | null,
  ];
}>();

const { t } = useI18n();
const eventId = computed<number | null>(() => props.eventId);
const eventIdValue = computed(() => props.eventId);
const selectedTimeWindowKey = ref<string | null>(null);
const selectedDateKey = ref<string | null>(null);

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

watch(
  detail,
  (event) => {
    emit(
      "header-context",
      event
        ? {
            title: event.title,
            subtitle: event.description ?? null,
          }
        : null,
    );
  },
  { immediate: true },
);

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

const formatCreateTimeWindowOptionLabel = (
  entry: CreateTimeWindow,
  index: number,
): string =>
  formatTimeWindowOptionLabel(
    entry.timeWindow,
    index,
    t("anchorEvent.batchLabel"),
    entry.description,
  );

const isExpiredDateGroupKey = (
  groupKey: string,
  todayDateKey: string,
): boolean =>
  isProductLocalDateKey(groupKey) &&
  groupKey < todayDateKey;

const isClosedPR = (pr: AnchorEventTimeWindowPR): boolean =>
  pr.status === "CLOSED";

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
  upcomingSortedCreateTimeWindows.value.map((entry, index) => ({
    entry,
    optionLabel: formatCreateTimeWindowOptionLabel(entry, index),
    subtitleLabel: formatTimeWindowLabel(
      entry.timeWindow,
      index,
      t("anchorEvent.batchLabel"),
    ),
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

  if (uniqueLocationIds.size === 0) {
    return null;
  }

  return Array.from(uniqueLocationIds).join(",");
});

const { data: eventPois } = usePoisByIds(allPoiIdsCsv);
const poiGalleryById = computed(() => toPoiGalleryMap(eventPois.value ?? []));

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

const isVisibleListModePR = (
  pr: AnchorEventTimeWindowPR,
  group: DateGroup,
): boolean =>
  group.isExpiredDate ? pr.status === "CLOSED" : pr.status !== "EXPIRED";

const resolveVisiblePRItemsForGroup = (group: DateGroup): VisiblePRItem[] => {
  const items: VisiblePRItem[] = [];

  for (const timeWindowItem of group.timeWindows) {
    for (const pr of timeWindowItem.entry.prs.filter((entry) =>
      isVisibleListModePR(entry, group),
    )) {
      items.push({
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
    if (!claimUserTelemetrySegmentDedupeKey("anchor_event.list.loaded")) {
      return;
    }

    trackEvent("anchor_event_list_loaded", {
      ...buildListFunnelPayload(),
      ...listLoadedCounts.value,
    });
  },
  { immediate: true },
);

watch(
  visiblePRItems,
  (items) => {
    for (const item of items) {
      if (
        !claimUserTelemetrySegmentDedupeKey(
          `anchor_event.pr_row.seen:${item.pr.id}`,
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

const isJoinablePR = (pr: AnchorEventTimeWindowPR): boolean =>
  pr.status === "OPEN" || pr.status === "READY";

const timeWindowHasJoinablePR = (entry: AnchorEventTimeWindow): boolean =>
  entry.prs.some(isJoinablePR);

const hasJoinablePRAtBrowseTimeWindowKey = (
  group: DateGroup | null,
  timeWindowKey: string,
): boolean => {
  const browseTimeWindow = group?.timeWindows.find(
    ({ entry }) => entry.key === timeWindowKey,
  )?.entry;
  if (!browseTimeWindow) {
    return false;
  }

  return timeWindowHasJoinablePR(browseTimeWindow);
};

const resolveDefaultCreateTimeWindowKey = (
  group: DateGroup | null,
  createTimeWindowChoices: CreateTimeWindowChoice[],
): string | null => {
  if (createTimeWindowChoices.length === 0) {
    return null;
  }

  const firstCreatableTimeWindowWithoutAvailablePR = createTimeWindowChoices.find(
    ({ entry }) =>
      entry.locationOptions.some((option) => !option.disabled) &&
      !hasJoinablePRAtBrowseTimeWindowKey(group, entry.key),
  );
  if (firstCreatableTimeWindowWithoutAvailablePR) {
    return firstCreatableTimeWindowWithoutAvailablePR.entry.key;
  }

  const firstCreatableTimeWindow = createTimeWindowChoices.find(({ entry }) =>
    entry.locationOptions.some((option) => !option.disabled),
  );
  if (firstCreatableTimeWindow) {
    return firstCreatableTimeWindow.entry.key;
  }

  return createTimeWindowChoices[0]?.entry.key ?? null;
};

watch(
  [selectedDateGroup, createTimeWindowChoices],
  ([group, createTimeWindowChoices]) => {
    const currentTimeWindowKey = selectedTimeWindowKey.value;
    if (
      currentTimeWindowKey !== null &&
      createTimeWindowChoices.some(({ entry }) => entry.key === currentTimeWindowKey)
    ) {
      return;
    }

    const preferredTimeWindowKey = resolveDefaultCreateTimeWindowKey(
      group,
      createTimeWindowChoices,
    );
    if (
      preferredTimeWindowKey !== null &&
      createTimeWindowChoices.some(({ entry }) => entry.key === preferredTimeWindowKey)
    ) {
      selectedTimeWindowKey.value = preferredTimeWindowKey;
      return;
    }

    selectedTimeWindowKey.value = createTimeWindowChoices[0]?.entry.key ?? null;
  },
  { immediate: true, deep: true },
);

const timeWindowLabelByKey = computed(() => {
  const map = new Map<string, string>();
  for (const timeWindowChoice of createTimeWindowChoices.value) {
    map.set(timeWindowChoice.entry.key, timeWindowChoice.subtitleLabel);
  }
  return map;
});

const createTimeWindowOptions = computed(() =>
  createTimeWindowChoices.value.map(({ entry, optionLabel }) => ({
    key: entry.key,
    label: optionLabel,
  })),
);

const selectedTimeWindowEntry = computed(() => {
  if (selectedTimeWindowKey.value === null) {
    return null;
  }

  return (
    createTimeWindowChoices.value.find(
      ({ entry }) => entry.key === selectedTimeWindowKey.value,
    )?.entry ?? null
  );
});

const createTimeWindowLabel = computed(() => {
  const targetTimeWindowKey = selectedTimeWindowEntry.value?.key ?? null;
  if (targetTimeWindowKey === null) {
    return "";
  }

  return timeWindowLabelByKey.value.get(targetTimeWindowKey) ?? "";
});

const createCardSubtitleTimeLabel = computed(() => {
  return createTimeWindowLabel.value;
});

const createTimeWindowLocationOptions = computed(
  () => selectedTimeWindowEntry.value?.locationOptions ?? [],
);

const hasJoinablePRInSelectedDate = computed(() => {
  const group = selectedDateGroup.value;
  if (!group) {
    return false;
  }

  return group.timeWindows.some(({ entry }) => timeWindowHasJoinablePR(entry));
});

const createCardTitle = computed(() => {
  if (hasJoinablePRInSelectedDate.value) {
    return t("anchorEvent.createCard.title");
  }

  return t("anchorEvent.createCard.titleWhenNoAvailablePR");
});

const shouldAutoExpandCreateCard = computed(() => {
  if (createTimeWindowChoices.value.length === 0) {
    return false;
  }

  return canUserCreatePR.value && !hasJoinablePRInSelectedDate.value;
});

const shouldAutoExpandBetaGroupCard = computed(
  () =>
    detail.value?.prCreationPolicy === "ADMIN_ONLY" &&
    eventBetaGroupQrCode.value !== null &&
    !hasJoinablePRInSelectedDate.value,
);

const createCardAutoExpandContextKey = computed(
  () =>
    `${selectedDateKey.value ?? "none"}:${selectedTimeWindowKey.value ?? "none"}`,
);

const betaGroupCardAutoExpandContextKey = computed(
  () =>
    `${selectedDateKey.value ?? "none"}:${eventBetaGroupQrCode.value ?? "none"}`,
);

const handleSelectedTimeWindowChange = (key: string | null) => {
  selectedTimeWindowKey.value = key;
};

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

const handleCreateInList = async (locationId: string | null) => {
  if (!canUserCreatePR.value) {
    return;
  }

  trackEvent("anchor_event_list_create_started", {
    ...buildListFunnelPayload(),
    dateKey: selectedDateKey.value,
    locationId,
    timeWindowStart: selectedTimeWindowEntry.value?.timeWindow[0] ?? null,
  });
  await createEventAssistedPR({
    targetTimeWindow: selectedTimeWindowEntry.value?.timeWindow ?? null,
    locationId,
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
  @include mx.pu-font(title-medium);
  color: var(--sys-color-on-surface);
}

.list-exhausted-card__body {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.list-exhausted-card__link {
  @include mx.pu-font(label-medium);
  justify-self: start;
  color: var(--sys-color-primary);
  text-decoration: none;
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
