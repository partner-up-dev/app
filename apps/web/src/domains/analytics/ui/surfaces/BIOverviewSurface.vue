<template>
  <section v-if="overview" class="analytics-panel" data-testid="admin-analytics.bi-overview">
    <div class="analytics-panel__header">
      <div>
        <h2>{{ t("adminAnalytics.biOverviewTitle") }}</h2>
        <p>{{ t("adminAnalytics.biOverviewSubtitle") }}</p>
      </div>
    </div>
    <dl class="nudge-summary-grid">
      <div v-for="item in overviewItems" :key="item.key">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
        <span>{{ item.detail }}</span>
      </div>
    </dl>
    <div class="analytics-lower-grid">
      <div class="analytics-table-wrap">
        <table class="analytics-table analytics-table--compact">
          <thead>
            <tr>
              <th>{{ t("adminAnalytics.retentionDateColumn") }}</th>
              <th>{{ t("adminAnalytics.activeUsersColumn") }}</th>
              <th>{{ t("adminAnalytics.retention3DayColumn") }}</th>
              <th>{{ t("adminAnalytics.retention5DayColumn") }}</th>
              <th>{{ t("adminAnalytics.retention7DayColumn") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visibleRetentionRows" :key="row.cohortDate">
              <td>{{ row.cohortDate }}</td>
              <td>{{ formatCount(row.activeUsers) }}</td>
              <td>{{ formatRate(row.retentionRate3Days) }}</td>
              <td>{{ formatRate(row.retentionRate5Days) }}</td>
              <td>{{ formatRate(row.retentionRate7Days) }}</td>
            </tr>
            <tr v-if="visibleRetentionRows.length === 0">
              <td colspan="5">{{ t("adminAnalytics.emptyTable") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="analytics-table-wrap">
        <table class="analytics-table analytics-table--compact">
          <thead>
            <tr>
              <th>{{ t("adminAnalytics.statusColumn") }}</th>
              <th>{{ t("adminAnalytics.prCountColumn") }}</th>
              <th>{{ t("adminAnalytics.shareColumn") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in overview.prLifecycle.statusRows" :key="row.status">
              <td>{{ formatStatus(row.status) }}</td>
              <td>{{ formatCount(row.count) }}</td>
              <td>{{ formatRate(row.share) }}</td>
            </tr>
            <tr v-if="overview.prLifecycle.statusRows.length === 0">
              <td colspan="3">{{ t("adminAnalytics.emptyTable") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <dl class="nudge-summary-grid nudge-summary-grid--compact">
      <div>
        <dt>{{ t("adminAnalytics.userPRAnyUsersMetric") }}</dt>
        <dd>{{ formatCount(overview.userPRCounts.usersWithAnyPR) }}</dd>
        <span>{{ t("adminAnalytics.userPRAnyUsersDetail") }}</span>
      </div>
      <div>
        <dt>{{ t("adminAnalytics.userPRJoinedMetric") }}</dt>
        <dd>{{ formatCount(overview.userPRCounts.joinedPRs) }}</dd>
        <span>{{
          t("adminAnalytics.userPRJoinedDetail", {
            users: formatCount(overview.userPRCounts.participantUsers),
          })
        }}</span>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  formatCount,
  formatRate,
  formatStatus as formatStatusLabel,
} from "../../model/presentation";
import type { AnalyticsDashboardViewModel } from "../../use-cases/useAnalyticsDashboard";

const props = defineProps<{ viewModel: AnalyticsDashboardViewModel }>();
const { t } = useI18n();
const overview = computed(() => props.viewModel.overviewQuery.data.value ?? null);
const visibleRetentionRows = computed(() => (overview.value?.retention.rows ?? []).slice(-7));
const latestRetention = computed(() => visibleRetentionRows.value.at(-1) ?? null);
const overviewItems = computed(() => {
  if (!overview.value) return [];
  return [
    {
      key: "retention",
      label: t("adminAnalytics.biRetentionMetric"),
      value: latestRetention.value
        ? formatRate(latestRetention.value.retentionRate7Days)
        : formatRate(0),
      detail: latestRetention.value
        ? t("adminAnalytics.biRetentionDetail", {
            date: latestRetention.value.cohortDate,
            active: formatCount(latestRetention.value.activeUsers),
          })
        : t("adminAnalytics.emptyTable"),
    },
    {
      key: "createdPRs",
      label: t("adminAnalytics.biCreatedPRMetric"),
      value: formatCount(overview.value.userPRCounts.createdPRs),
      detail: t("adminAnalytics.biCreatedPRDetail", {
        users: formatCount(overview.value.userPRCounts.creatorUsers),
      }),
    },
    {
      key: "lifecycle",
      label: t("adminAnalytics.biLifecycleMetric"),
      value: formatCount(overview.value.prLifecycle.formedPRs),
      detail: t("adminAnalytics.biLifecycleDetail", {
        closed: formatCount(overview.value.prLifecycle.timeWindowEndAtCohort.closedPRs),
        expired: formatCount(overview.value.prLifecycle.timeWindowEndAtCohort.expiredPRs),
      }),
    },
  ];
});
const formatStatus = (status: string) =>
  formatStatusLabel(status, (key, params) => (params ? t(key, params) : t(key)));
</script>

<style lang="scss" scoped>
.analytics-panel,
.analytics-panel__header,
.nudge-summary-grid > div {
  min-width: 0;
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
.analytics-panel h2,
.analytics-panel p,
.nudge-summary-grid dt,
.nudge-summary-grid dd,
.nudge-summary-grid span {
  margin: 0;
}
.analytics-panel h2 {
  @include mx.pu-font(title);
}
.analytics-panel p,
.nudge-summary-grid dt,
.nudge-summary-grid span {
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
.nudge-summary-grid--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.analytics-lower-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
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
  .nudge-summary-grid,
  .analytics-lower-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .nudge-summary-grid,
  .analytics-lower-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
