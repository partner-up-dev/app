<template>
  <section
    ref="sectionRef"
    class="pr-discovery-highlights"
    :class="{ 'is-in-view': isInView }"
    aria-labelledby="home-discovery-highlights-title"
    data-testid="home.discovery-highlights"
  >
    <header
      class="pr-discovery-highlights__header"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(0)"
    >
      <h2 id="home-discovery-highlights-title">
        {{ t("home.landing.discoveryHighlights.title") }}
      </h2>

      <PuChipGroup class="pr-discovery-highlights__tags" gap="sm">
        <PuChip variant="outline" size="sm">
          {{ t("home.landing.discoveryHighlights.tags.time") }}
        </PuChip>
        <PuChip variant="outline" size="sm">
          {{ t("home.landing.discoveryHighlights.tags.place") }}
        </PuChip>
        <PuChip variant="outline" size="sm">
          {{ t("home.landing.discoveryHighlights.tags.support") }}
        </PuChip>
      </PuChipGroup>

      <p class="pr-discovery-highlights__description">
        {{ t("home.landing.discoveryHighlights.description") }}
      </p>
    </header>

    <PuLoadingState
      v-if="catalogQuery.isLoading.value"
      class="pr-discovery-highlights__state"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      compact
      align="start"
      :message="t('home.landing.discoveryHighlights.loading')"
    />
    <PuInlineNotice
      v-else-if="catalogQuery.isError.value"
      class="pr-discovery-highlights__state"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      tone="error"
      :message="t('home.landing.discoveryHighlights.loadFailed')"
    >
      <template #actions>
        <RouterLink
          class="pr-discovery-highlights__fallback-action"
          :to="{ name: 'pr-discovery' }"
        >
          {{ t("home.landing.discoveryHighlights.browseAction") }}
        </RouterLink>
      </template>
    </PuInlineNotice>
    <PuEmptyState
      v-else-if="catalogItems.length === 0"
      class="pr-discovery-highlights__state"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      compact
      align="start"
      variant="plain"
      :description="t('home.landing.discoveryHighlights.empty')"
    >
      <template #actions>
        <RouterLink
          class="pr-discovery-highlights__fallback-action"
          :to="{ name: 'pr-discovery' }"
        >
          {{ t("home.landing.discoveryHighlights.browseAction") }}
        </RouterLink>
      </template>
    </PuEmptyState>

    <PRDiscoveryTypeHorizontalList
      v-else
      class="pr-discovery-highlights__list"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      :items="catalogItems"
      variant="full-bleed"
      :auto-scroll="isInView"
      :max-count="catalogItems.length"
    />
  </section>
</template>

<script setup lang="ts">
import {
  PuChip,
  PuChipGroup,
  PuEmptyState,
  PuInlineNotice,
  PuLoadingState,
} from "@partner-up-dev/design-web";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { usePRDiscoveryCatalog } from "@/domains/pr/queries/usePRDiscovery";
import PRDiscoveryTypeHorizontalList from "@/domains/pr/ui/discovery/list/PRDiscoveryTypeHorizontalList.vue";
import { useInViewStagger } from "@/shared/motion/useInViewStagger";

const { t } = useI18n();
const catalogQuery = usePRDiscoveryCatalog();
const catalogItems = computed(() => catalogQuery.data.value ?? []);
const { targetRef: sectionRef, isInView, itemMotionStyle } = useInViewStagger();
</script>

<style lang="scss" scoped>
.pr-discovery-highlights {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-large) + var(--sys-spacing-medium));
  width: 100%;
  min-width: 0;
  min-height: 0;
  position: relative;
  isolation: isolate;
}

.pr-discovery-highlights__header {
  @include mx.pu-motion-enter(0.7rem);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  position: relative;
  z-index: 4;

  h2 {
    @include mx.pu-font(section);
    margin: 0;
    color: var(--sys-color-on-surface);
  }
}

.pr-discovery-highlights__tags {
  align-items: center;
}

.pr-discovery-highlights__description {
  @include mx.pu-font(body);
  max-width: 36ch;
  margin: 0;
  color: var(--sys-color-on-surface);
}

.pr-discovery-highlights__state,
.pr-discovery-highlights__list {
  @include mx.pu-motion-enter(0.65rem);
}

.pr-discovery-highlights__state {
  position: relative;
  z-index: 1;
}

.pr-discovery-highlights__list {
  position: relative;
  z-index: 3;
}

.pr-discovery-highlights__fallback-action {
  width: fit-content;
  padding: 0;
  border: none;
  color: var(--sys-color-primary);
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4286;
  text-decoration: none;
}

.pr-discovery-highlights__fallback-action:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

</style>
