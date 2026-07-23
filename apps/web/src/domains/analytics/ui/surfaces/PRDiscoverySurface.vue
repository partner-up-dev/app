<template>
  <div class="analytics-dashboard">
    <section v-if="dashboard" class="kpi-strip" data-testid="admin-analytics.pr-discovery-summary">
      <article v-for="item in summaryItems" :key="item.key" class="kpi-card">
        <span class="kpi-card__label">{{ item.label }}</span
        ><strong class="kpi-card__value">{{ item.value }}</strong
        ><span class="kpi-card__detail">{{ item.detail }}</span>
      </article>
    </section>
    <section
      v-if="dashboard"
      class="analytics-panel"
      data-testid="admin-analytics.pr-discovery-funnel"
    >
      <div class="analytics-panel__header">
        <div>
          <h2>{{ t("adminAnalytics.prDiscoveryFunnelTitle") }}</h2>
          <p>{{ t("adminAnalytics.prDiscoveryFunnelSubtitle") }}</p>
        </div>
      </div>
      <FunnelStepsTable :steps="dashboard.steps" />
      <div class="analytics-table-wrap">
        <table class="analytics-table analytics-table--compact">
          <thead>
            <tr>
              <th>{{ t("adminAnalytics.prTypeLabel") }}</th>
              <th>{{ t("adminAnalytics.viewModeLabel") }}</th>
              <th>{{ t("adminAnalytics.originLabel") }}</th>
              <th>{{ t("adminAnalytics.journeysColumn") }}</th>
              <th>{{ t("adminAnalytics.eventsColumn") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in dashboard.dimensions"
              :key="`${row.prType}:${row.viewMode}:${row.origin}`"
            >
              <td>{{ row.prType }}</td>
              <td>{{ row.viewMode }}</td>
              <td>{{ row.origin }}</td>
              <td>{{ formatCount(row.journeyCount) }}</td>
              <td>{{ formatCount(row.eventCount) }}</td>
            </tr>
            <tr v-if="dashboard.dimensions.length === 0">
              <td colspan="5">{{ t("adminAnalytics.emptyTable") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatCount } from "../../model/presentation";
import type { AnalyticsDashboardViewModel } from "../../use-cases/useAnalyticsDashboard";
import FunnelStepsTable from "../components/FunnelStepsTable.vue";

const props = defineProps<{ viewModel: AnalyticsDashboardViewModel }>();
const { t } = useI18n();
const dashboard = computed(() => props.viewModel.discoveryQuery.data.value ?? null);
const summaryItems = computed(() => {
  const summary = dashboard.value?.summary;
  if (!summary) return [];
  return [
    {
      key: "surface",
      label: t("adminAnalytics.prDiscoverySurfaceMetric"),
      value: formatCount(summary.surfaceJourneys),
      detail: t("adminAnalytics.prDiscoverySurfaceDetail"),
    },
    {
      key: "recommendation",
      label: t("adminAnalytics.prDiscoveryRecommendationMetric"),
      value: formatCount(summary.recommendationJourneys),
      detail: t("adminAnalytics.prDiscoveryRecommendationDetail"),
    },
    {
      key: "candidate",
      label: t("adminAnalytics.prDiscoveryCandidateMetric"),
      value: formatCount(summary.candidateJourneys),
      detail: t("adminAnalytics.prDiscoveryCandidateDetail"),
    },
    {
      key: "handoff",
      label: t("adminAnalytics.prDiscoveryHandoffMetric"),
      value: formatCount(summary.authoringHandoffJourneys),
      detail: t("adminAnalytics.prDiscoveryHandoffDetail"),
    },
  ];
});
</script>

<style lang="scss" scoped>
.analytics-dashboard,
.analytics-panel,
.analytics-panel__header,
.kpi-card {
  min-width: 0;
}
.analytics-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
}
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}
.kpi-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  min-height: 116px;
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
}
.kpi-card__label,
.kpi-card__detail {
  @include mx.pu-font(control);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}
.kpi-card__detail {
  @include mx.pu-font(support);
}
.kpi-card__value {
  @include mx.pu-font(hero);
  color: var(--sys-color-on-surface);
}
.analytics-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-lowest);
}
.analytics-panel__header {
  display: flex;
  align-items: flex-start;
  gap: var(--sys-spacing-small);
}
.analytics-panel h2,
.analytics-panel p {
  margin: 0;
}
.analytics-panel h2 {
  @include mx.pu-font(title);
}
.analytics-panel p {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}
.analytics-table-wrap {
  min-width: 0;
  overflow-x: auto;
}
.analytics-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}
.analytics-table--compact {
  min-width: 420px;
}
.analytics-table th,
.analytics-table td {
  @include mx.pu-font(body);
  padding: var(--sys-spacing-small);
  border-bottom: 1px solid var(--sys-color-outline-variant);
  text-align: left;
}
.analytics-table th {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}
@media (max-width: 1180px) {
  .kpi-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .kpi-strip {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
