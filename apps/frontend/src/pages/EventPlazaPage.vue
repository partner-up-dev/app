<template>
  <PuPageScaffold class="event-plaza-page">
    <PageHeader
      :title="t('eventPlaza.title')"
      :subtitle="t('eventPlaza.subtitle')"
    >
      <template #top-actions>
        <PuButton
          :action="{ to: { name: 'event-pr-search' } }"
          class="event-plaza-page__search-link"
          shape="pill"
          tone="primary"
          variant="outline"
          size="sm"
        >
          {{ t("eventPlaza.searchAction") }}
        </PuButton>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="loading-state">
      {{ t("common.loading") }}
    </div>

    <div v-else-if="isError" class="error-state">
      {{ t("eventPlaza.loadFailed") }}
    </div>

    <div v-else-if="randomizedEvents.length > 0" class="event-grid">
      <EventCard
        v-for="event in randomizedEvents"
        :key="event.id"
        :event="event"
      />
    </div>

    <div v-else class="empty-state">
      {{ t("eventPlaza.noEvents") }}
    </div>
  </PuPageScaffold>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import EventCard from "@/domains/event/ui/primitives/EventCard.vue";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";
import type { AnchorEventListResponse } from "@/domains/event/model/types";
import { PuButton, PuPageScaffold } from "@partner-up-dev/design-web";

const { t } = useI18n();
const { data: events, isLoading, isError } = useAnchorEvents();

const shuffleEvents = (
  eventList: AnchorEventListResponse,
): AnchorEventListResponse => {
  const shuffledEvents = [...eventList];
  for (let index = shuffledEvents.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledEvents[index], shuffledEvents[randomIndex]] = [
      shuffledEvents[randomIndex],
      shuffledEvents[index],
    ];
  }
  return shuffledEvents;
};

const randomizedEvents = ref<AnchorEventListResponse>([]);

watch(
  events,
  (nextEvents) => {
    randomizedEvents.value = shuffleEvents(nextEvents ?? []);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--sys-color-on-surface-variant);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.event-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-plaza-page__search-link {
  white-space: nowrap;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
