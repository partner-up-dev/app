<template>
  <div
    v-if="shouldRenderSection && variant === 'panel'"
    ref="sectionRef"
    class="other-anchor-events__panel-shell"
  >
    <PuCard
      as="section"
      class="other-anchor-events other-anchor-events--panel"
      :title="t('anchorEvent.otherEvents.title')"
      :toggle-label="t('anchorEvent.otherEvents.title')"
      :default-expanded="false"
      collapsible
      variant="outline"
    >
      <PuLoadingState
        v-if="isLoading"
        compact
        align="start"
        :message="t('common.loading')"
      />

      <AnchorEventHorizontalList
        v-else
        :events="otherEvents"
        variant="contained"
        card-surface="outline"
        :auto-scroll="isInView"
      />
    </PuCard>
  </div>

  <section
    v-else-if="shouldRenderSection"
    ref="sectionRef"
    class="other-anchor-events other-anchor-events--embedded"
  >
    <h3 class="other-anchor-events__title">
      {{ t("anchorEvent.otherEvents.title") }}
    </h3>

    <PuLoadingState
      v-if="isLoading"
      compact
      align="start"
      :message="t('common.loading')"
    />

    <AnchorEventHorizontalList
      v-else
      :events="otherEvents"
      variant="contained"
      card-surface="outline"
      :auto-scroll="isInView"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";
import { useInViewStagger } from "@/shared/motion/useInViewStagger";
import AnchorEventHorizontalList from "@/domains/event/ui/composites/AnchorEventHorizontalList.vue";
import { PuCard, PuLoadingState } from "@partner-up-dev/design-web";

const props = withDefaults(
  defineProps<{
    currentEventId?: number | null;
    variant?: "embedded" | "panel";
  }>(),
  {
    currentEventId: null,
    variant: "embedded",
  },
);

const { t } = useI18n();
const { targetRef: sectionRef, isInView } = useInViewStagger({ once: false });
const { data: events, isLoading, isError } = useAnchorEvents();

const otherEvents = computed(() => {
  const eventList = events.value ?? [];

  if (props.currentEventId === null) {
    return eventList;
  }

  return eventList.filter((event) => event.id !== props.currentEventId);
});

const shouldRenderSection = computed(() => {
  if (isError.value) {
    return false;
  }

  return isLoading.value || otherEvents.value.length > 0;
});
</script>

<style lang="scss" scoped>
.other-anchor-events {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.other-anchor-events__panel-shell {
  min-width: 0;
}

.other-anchor-events--embedded {
  padding-top: var(--sys-spacing-medium);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.other-anchor-events__title {
  margin: 0;
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

</style>
