<template>
  <div class="analytics-dashboard">
    <section
      v-if="createFunnel"
      class="analytics-panel"
      data-testid="admin-analytics.pr-create-funnel"
    >
      <div class="analytics-panel__header">
        <div>
          <h2>{{ t("adminAnalytics.prCreateFunnelTitle") }}</h2>
          <p>{{ t("adminAnalytics.prCreateFunnelSubtitle") }}</p>
        </div>
      </div>
      <dl class="nudge-summary-grid">
        <div v-for="item in createSummaryItems" :key="item.key">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
          <span>{{ item.detail }}</span>
        </div>
      </dl>
      <FunnelStepsTable :steps="createFunnel.steps" />
      <div class="analytics-table-wrap">
        <table class="analytics-table analytics-table--compact">
          <thead>
            <tr>
              <th>{{ t("adminAnalytics.prCreatePathColumn") }}</th>
              <th>{{ t("adminAnalytics.journeysColumn") }}</th>
              <th>{{ t("adminAnalytics.eventsColumn") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in createFunnel.paths" :key="row.creationPath">
              <td>{{ formatCreatePath(row.creationPath) }}</td>
              <td>{{ formatCount(row.journeyCount) }}</td>
              <td>{{ formatCount(row.eventCount) }}</td>
            </tr>
            <tr v-if="createFunnel.paths.length === 0">
              <td colspan="3">{{ t("adminAnalytics.emptyTable") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="projection-footnote">
        {{
          t("adminAnalytics.prCreateProjectionContextDetail", {
            events: formatCount(createFunnel.context.eventCount),
            route: formatCount(createFunnel.context.routeContextUnknownEvents),
            auth: formatCount(createFunnel.context.authContextUnknownEvents),
            authenticated: formatCount(createFunnel.identity.authenticatedJourneys),
            unknown: formatCount(createFunnel.identity.unknownSessionJourneys),
          })
        }}
      </p>
    </section>
    <section v-if="joinFunnel" class="analytics-panel" data-testid="admin-analytics.pr-join-funnel">
      <div class="analytics-panel__header">
        <div>
          <h2>{{ t("adminAnalytics.prJoinFunnelTitle") }}</h2>
          <p>{{ t("adminAnalytics.prJoinFunnelSubtitle") }}</p>
        </div>
      </div>
      <dl class="nudge-summary-grid">
        <div v-for="item in joinSummaryItems" :key="item.key">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
          <span>{{ item.detail }}</span>
        </div>
      </dl>
      <FunnelStepsTable :steps="joinFunnel.steps" />
      <p class="projection-footnote">
        {{
          t("adminAnalytics.prJoinProjectionContextDetail", {
            events: formatCount(joinFunnel.context.eventCount),
            route: formatCount(joinFunnel.context.routeContextUnknownEvents),
            auth: formatCount(joinFunnel.context.authContextUnknownEvents),
            authenticated: formatCount(joinFunnel.identity.authenticatedJourneys),
            unknown: formatCount(joinFunnel.identity.unknownSessionJourneys),
          })
        }}
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  formatCount,
  formatCreatePath as formatCreatePathLabel,
  formatRate,
} from "../../model/presentation";
import type { AnalyticsDashboardViewModel } from "../../use-cases/useAnalyticsDashboard";
import FunnelStepsTable from "../components/FunnelStepsTable.vue";

const props = defineProps<{ viewModel: AnalyticsDashboardViewModel }>();
const { t } = useI18n();
const createFunnel = computed(() => props.viewModel.createQuery.data.value ?? null);
const joinFunnel = computed(() => props.viewModel.joinQuery.data.value ?? null);
const formatCreatePath = (path: string) =>
  formatCreatePathLabel(path, (key, params) => (params ? t(key, params) : t(key)));
const createSummaryItems = computed(() => {
  const summary = createFunnel.value?.summary;
  if (!summary) return [];
  return [
    {
      key: "entryJourneys",
      label: t("adminAnalytics.prCreateEntryMetric"),
      value: formatCount(summary.entryJourneys),
      detail: t("adminAnalytics.prCreateEntryDetail"),
    },
    {
      key: "frontendSuccessJourneys",
      label: t("adminAnalytics.prCreateFrontendSuccessMetric"),
      value: formatCount(summary.frontendSuccessJourneys),
      detail: t("adminAnalytics.prCreateFrontendSuccessDetail"),
    },
    {
      key: "backendCreatedJourneys",
      label: t("adminAnalytics.prCreateBackendCreatedMetric"),
      value: formatCount(summary.backendCreatedJourneys),
      detail: t("adminAnalytics.prCreateBackendCreatedDetail"),
    },
    {
      key: "entryToBackendCreatedRate",
      label: t("adminAnalytics.prCreateEntryToBackendRateMetric"),
      value: formatRate(summary.entryToBackendCreatedRate),
      detail: t("adminAnalytics.prCreateEntryToBackendRateDetail"),
    },
  ];
});
const joinSummaryItems = computed(() => {
  const summary = joinFunnel.value?.summary;
  if (!summary) return [];
  return [
    {
      key: "impressionJourneys",
      label: t("adminAnalytics.prJoinImpressionMetric"),
      value: formatCount(summary.impressionJourneys),
      detail: t("adminAnalytics.prJoinImpressionDetail"),
    },
    {
      key: "clickJourneys",
      label: t("adminAnalytics.prJoinClickMetric"),
      value: formatCount(summary.clickJourneys),
      detail: t("adminAnalytics.prJoinClickDetail"),
    },
    {
      key: "backendJoinedJourneys",
      label: t("adminAnalytics.prJoinBackendJoinedMetric"),
      value: formatCount(summary.backendJoinedJourneys),
      detail: t("adminAnalytics.prJoinBackendJoinedDetail"),
    },
    {
      key: "clickToBackendJoinRate",
      label: t("adminAnalytics.prJoinClickToBackendRateMetric"),
      value: formatRate(summary.clickToBackendJoinRate),
      detail: t("adminAnalytics.prJoinClickToBackendRateDetail"),
    },
  ];
});
</script>

<style lang="scss" scoped>
.analytics-dashboard,
.analytics-panel,
.analytics-panel__header,
.nudge-summary-grid > div {
  min-width: 0;
}
.analytics-dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
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
.analytics-panel p,
.nudge-summary-grid dt,
.nudge-summary-grid dd,
.nudge-summary-grid span,
.projection-footnote {
  margin: 0;
}
.analytics-panel h2 {
  @include mx.pu-font(title);
}
.analytics-panel p,
.nudge-summary-grid dt,
.nudge-summary-grid span,
.projection-footnote {
  @include mx.pu-font(caption);
  color: var(--sys-color-on-surface-variant);
}
.nudge-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
  padding: 0;
  margin: 0;
}
.nudge-summary-grid > div {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container);
}
.nudge-summary-grid dd {
  @include mx.pu-font(title);
  color: var(--sys-color-on-surface);
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
.analytics-table__hint {
  @include mx.pu-font(support);
  display: block;
  color: var(--sys-color-on-surface-variant);
}
@media (max-width: 1180px) {
  .nudge-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .nudge-summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
