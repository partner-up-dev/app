<template>
  <aside class="analytics-filter-rail" data-testid="admin-analytics.filters">
    <div class="analytics-filter-rail__header">
      <p class="analytics-filter-rail__eyebrow">{{ t("adminAnalytics.filtersTitle") }}</p>
      <p class="analytics-filter-rail__summary">{{ activeFilterSummary }}</p>
    </div>

    <PuFormItem :label="t('adminAnalytics.startAtLabel')" for-id="analytics-start-at">
      <PuInput id="analytics-start-at" v-model="draft.startAt" native-type="datetime-local" />
    </PuFormItem>
    <PuFormItem :label="t('adminAnalytics.endAtLabel')" for-id="analytics-end-at">
      <PuInput id="analytics-end-at" v-model="draft.endAt" native-type="datetime-local" />
    </PuFormItem>
    <template v-if="showDiscoveryDimensions">
      <PuFormItem :label="t('adminAnalytics.prTypeLabel')" for-id="analytics-pr-type">
        <PuInput
          id="analytics-pr-type"
          v-model="draft.prType"
          native-type="text"
          :placeholder="t('adminAnalytics.prTypePlaceholder')"
        />
      </PuFormItem>
      <PuFormItem :label="t('adminAnalytics.viewModeLabel')" for-id="analytics-view-mode">
        <PuSelect id="analytics-view-mode" v-model="draft.viewMode" :options="viewModeOptions" />
      </PuFormItem>
      <PuFormItem :label="t('adminAnalytics.originLabel')" for-id="analytics-origin">
        <PuInput
          id="analytics-origin"
          v-model="draft.origin"
          native-type="text"
          :placeholder="t('adminAnalytics.originPlaceholder')"
        />
      </PuFormItem>
    </template>

    <PuInlineNotice
      v-if="filterError"
      tone="error"
      :message="t(filterError)"
      data-testid="admin-analytics.filters.error"
    />
    <div class="analytics-filter-rail__actions">
      <PuButton
        shape="rect"
        tone="primary"
        variant="solid"
        data-testid="admin-analytics.filters.apply"
        @click="$emit('apply')"
      >
        <template #leading><span class="i-mdi-filter-check" aria-hidden="true"></span></template>
        {{ t("adminAnalytics.applyFiltersAction") }}
      </PuButton>
      <PuButton
        shape="rect"
        tone="neutral"
        variant="outline"
        data-testid="admin-analytics.filters.reset"
        @click="$emit('reset')"
      >
        <template #leading><span class="i-mdi-refresh" aria-hidden="true"></span></template>
        {{ t("adminAnalytics.resetFiltersAction") }}
      </PuButton>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuFormItem,
  PuInlineNotice,
  PuInput,
  PuSelect,
  type PuSelectOption,
} from "@partner-up-dev/design-web";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { analyticsViewModes, type AnalyticsDraftFilters } from "../../model/filters";

defineProps<{
  draft: AnalyticsDraftFilters;
  showDiscoveryDimensions: boolean;
  filterError: string | null;
  activeFilterSummary: string;
}>();

defineEmits<{ apply: []; reset: [] }>();

const { t } = useI18n();
const viewModeOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminAnalytics.allModesOption"), value: "" },
  ...analyticsViewModes.map((mode) => ({ label: mode, value: mode })),
]);
</script>

<style lang="scss" scoped>
.analytics-filter-rail,
.analytics-filter-rail__header,
.analytics-filter-rail__actions {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.analytics-filter-rail {
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}

.analytics-filter-rail__header {
  gap: var(--sys-spacing-xsmall);
}
.analytics-filter-rail__eyebrow,
.analytics-filter-rail__summary {
  margin: 0;
}
.analytics-filter-rail__eyebrow {
  @include mx.pu-font(control);
  color: var(--sys-color-primary);
}
.analytics-filter-rail__summary {
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}
.analytics-filter-rail__actions {
  gap: var(--sys-spacing-small);
}
</style>
