<template>
  <section
    ref="sectionRef"
    class="event-highlights"
    :class="{ 'is-in-view': isInView }"
    aria-labelledby="home-highlights-title"
  >
    <header
      class="highlights-header"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(0)"
    >
      <h2 id="home-highlights-title">
        {{ t("home.landing.highlightsTitle") }}
      </h2>

      <PuChipGroup class="highlights-trust-cues" gap="sm">
        <PuChip variant="outline" size="sm">
          {{ t("home.landing.highlightsCueFixedTime") }}
        </PuChip>
        <PuChip variant="outline" size="sm">
          {{ t("home.landing.highlightsCueFixedLocation") }}
        </PuChip>
        <PuChip variant="outline" size="sm">
          {{ t("home.landing.highlightsCueSubsidy") }}
        </PuChip>
      </PuChipGroup>

      <p class="highlights-bridge">
        {{ t("home.landing.highlightsBridge") }}
      </p>
    </header>

    <PuLoadingState
      v-if="isLoading"
      class="state-view"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      compact
      align="start"
      :message="t('common.loading')"
    />
    <PuInlineNotice
      v-else-if="isError"
      class="fallback-state"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      tone="error"
      :message="t('home.landing.highlightsLoadFailed')"
    >
      <template #actions>
        <RouterLink class="fallback-action" :to="{ name: 'event-plaza' }">
          {{ t("home.landing.highlightsOpenPlaza") }}
        </RouterLink>
      </template>
    </PuInlineNotice>
    <PuEmptyState
      v-else-if="highlightEvents.length === 0"
      class="fallback-state"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      compact
      align="start"
      variant="plain"
      :description="t('home.landing.highlightsEmpty')"
    >
      <template #actions>
        <RouterLink class="fallback-action" :to="{ name: 'event-plaza' }">
          {{ t("home.landing.highlightsOpenPlaza") }}
        </RouterLink>
      </template>
    </PuEmptyState>

    <AnchorEventHorizontalList
      v-else
      class="highlights-list"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      :events="highlightEvents"
      variant="full-bleed"
      :auto-scroll="isInView"
      :max-count="highlightEvents.length"
      @card-click="trackHighlightClick($event.eventId, $event.index)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import AnchorEventHorizontalList from "@/domains/event/ui/composites/AnchorEventHorizontalList.vue";
import { useInViewStagger } from "@/shared/motion/useInViewStagger";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";
import { trackEvent } from "@/shared/telemetry/track";
import {
  PuChip,
  PuChipGroup,
  PuEmptyState,
  PuInlineNotice,
  PuLoadingState,
} from "@partner-up-dev/design-web";

const { t } = useI18n();
const { targetRef: sectionRef, isInView, itemMotionStyle } = useInViewStagger();
const { data: events, isLoading, isError } = useAnchorEvents();

const highlightEvents = computed(() => events.value ?? []);

const hasTrackedSectionImpression = ref(false);

const trackHighlightClick = (eventId: number, index: number) => {
  trackEvent("home_event_highlight_click", {
    eventId,
    index,
  });
};

watchEffect(() => {
  if (hasTrackedSectionImpression.value) {
    return;
  }
  if (!isInView.value || isLoading.value || isError.value) {
    return;
  }

  hasTrackedSectionImpression.value = true;
  trackEvent("home_event_section_impression", {
    source: "landing_v2",
    hasMappedUnit: false,
    unitCount: highlightEvents.value.length,
  });
});
</script>

<style lang="scss" scoped>
.event-highlights {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-large) + var(--sys-spacing-medium));
  width: 100%;
  min-width: 0;
  min-height: 0;
  position: relative;
  isolation: isolate;
}

.highlights-header {
  @include mx.pu-motion-enter(0.7rem);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  position: relative;
  z-index: 4;

  h2 {
    font-size: 1.5rem;
    font-weight: 200;
    line-height: 2.25rem;
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}

.highlights-bridge {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  max-width: 36ch;
}

.highlights-trust-cues {
  align-items: center;
}

.state-view,
.fallback-state,
.highlights-list {
  @include mx.pu-motion-enter(0.65rem);
}

.state-view,
.fallback-state {
  position: relative;
  z-index: 1;
}

.fallback-action {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  width: fit-content;
  text-decoration: none;
  color: var(--sys-color-primary);
  padding: 0;
  border: none;
  background: transparent;
}

.highlights-list {
  position: relative;
  z-index: 3;
}
</style>
