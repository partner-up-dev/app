<template>
  <AdminPageScaffold class="admin-analytics-page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #rail>
      <aside class="analytics-filter-rail" data-testid="admin-analytics.filters">
        <div class="analytics-filter-rail__header">
          <p class="analytics-filter-rail__eyebrow">
            {{ t("adminAnalytics.filtersTitle") }}
          </p>
          <p class="analytics-filter-rail__summary">
            {{ activeFilterSummary }}
          </p>
        </div>

        <PuFormItem :label="t('adminAnalytics.startAtLabel')" for-id="analytics-start-at">
          <PuInput id="analytics-start-at" v-model="draftStartAt" native-type="datetime-local" />
        </PuFormItem>

        <PuFormItem :label="t('adminAnalytics.endAtLabel')" for-id="analytics-end-at">
          <PuInput id="analytics-end-at" v-model="draftEndAt" native-type="datetime-local" />
        </PuFormItem>

        <PuFormItem
          v-if="showsPRDiscoveryDashboard"
          :label="t('adminAnalytics.prTypeLabel')"
          for-id="analytics-pr-type"
        >
          <PuInput
            id="analytics-pr-type"
            v-model="draftPRType"
            native-type="text"
            :placeholder="t('adminAnalytics.prTypePlaceholder')"
          />
        </PuFormItem>

        <PuFormItem
          v-if="showsPRDiscoveryDashboard"
          :label="t('adminAnalytics.viewModeLabel')"
          for-id="analytics-view-mode"
        >
          <PuSelect
            id="analytics-view-mode"
            v-model="draftViewModeModel"
            :options="viewModeOptions"
          />
        </PuFormItem>

        <PuFormItem
          v-if="showsPRDiscoveryDashboard"
          :label="t('adminAnalytics.originLabel')"
          for-id="analytics-origin"
        >
          <PuInput
            id="analytics-origin"
            v-model="draftOrigin"
            native-type="text"
            :placeholder="t('adminAnalytics.originPlaceholder')"
          />
        </PuFormItem>

        <PuInlineNotice
          v-if="filterError"
          tone="error"
          :message="filterError"
          data-testid="admin-analytics.filters.error"
        />

        <div class="analytics-filter-rail__actions">
          <PuButton
            shape="rect"
            tone="primary"
            variant="solid"
            data-testid="admin-analytics.filters.apply"
            @click="applyFilters"
          >
            <template #leading>
              <span class="i-mdi-filter-check" aria-hidden="true"></span>
            </template>
            {{ t("adminAnalytics.applyFiltersAction") }}
          </PuButton>
          <PuButton
            shape="rect"
            tone="neutral"
            variant="outline"
            data-testid="admin-analytics.filters.reset"
            @click="resetFilters"
          >
            <template #leading>
              <span class="i-mdi-refresh" aria-hidden="true"></span>
            </template>
            {{ t("adminAnalytics.resetFiltersAction") }}
          </PuButton>
        </div>
      </aside>
    </template>

    <template #actions>
      <PuButton
        shape="pill"
        tone="neutral"
        variant="soft"
        size="sm"
        :loading="isDashboardRefreshing"
        data-testid="admin-analytics.refresh"
        @click="refreshDashboard"
      >
        <template #leading>
          <span class="i-mdi-sync" aria-hidden="true"></span>
        </template>
        {{ t("adminAnalytics.refreshAction") }}
      </PuButton>
    </template>

    <template #main>
      <div class="analytics-dashboard" data-testid="admin-analytics.dashboard">
        <PuLoadingState v-if="isInitialLoading" :message="t('adminAnalytics.loading')" />
        <PuInlineNotice
          v-else-if="dashboardError"
          tone="error"
          :title="t('adminAnalytics.loadFailedTitle')"
          :message="dashboardError.message"
          data-testid="admin-analytics.error"
        />

        <template v-else-if="hasDashboardData">
          <section
            v-if="showsPRDiscoveryDashboard && dashboard"
            class="kpi-strip"
            data-testid="admin-analytics.pr-discovery-summary"
          >
            <article v-for="item in prDiscoverySummaryItems" :key="item.key" class="kpi-card">
              <span class="kpi-card__label">{{ item.label }}</span>
              <strong class="kpi-card__value">{{ item.value }}</strong>
              <span v-if="item.detail" class="kpi-card__detail">
                {{ item.detail }}
              </span>
            </article>
          </section>

          <section
            v-if="showsOverviewDashboard && biOverview"
            class="analytics-panel"
            data-testid="admin-analytics.bi-overview"
          >
            <div class="analytics-panel__header">
              <div>
                <h2>{{ t("adminAnalytics.biOverviewTitle") }}</h2>
                <p>{{ t("adminAnalytics.biOverviewSubtitle") }}</p>
              </div>
            </div>

            <dl class="nudge-summary-grid">
              <div v-for="item in biOverviewItems" :key="item.key">
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
                    <tr v-for="row in biOverview.prLifecycle.statusRows" :key="row.status">
                      <td>{{ formatPRStatus(row.status) }}</td>
                      <td>{{ formatCount(row.count) }}</td>
                      <td>{{ formatRate(row.share) }}</td>
                    </tr>
                    <tr v-if="biOverview.prLifecycle.statusRows.length === 0">
                      <td colspan="3">{{ t("adminAnalytics.emptyTable") }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="analytics-lower-grid">
              <dl class="nudge-summary-grid nudge-summary-grid--compact">
                <div>
                  <dt>{{ t("adminAnalytics.userPRAnyUsersMetric") }}</dt>
                  <dd>{{ formatCount(biOverview.userPRCounts.usersWithAnyPR) }}</dd>
                  <span>{{ t("adminAnalytics.userPRAnyUsersDetail") }}</span>
                </div>
                <div>
                  <dt>{{ t("adminAnalytics.userPRJoinedMetric") }}</dt>
                  <dd>{{ formatCount(biOverview.userPRCounts.joinedPRs) }}</dd>
                  <span>
                    {{
                      t("adminAnalytics.userPRJoinedDetail", {
                        users: formatCount(biOverview.userPRCounts.participantUsers),
                      })
                    }}
                  </span>
                </div>
              </dl>
            </div>
          </section>

          <section
            v-if="showsPRFunnelDashboard && prCreateFunnel"
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
              <div v-for="item in prCreateSummaryItems" :key="item.key">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
                <span>{{ item.detail }}</span>
              </div>
            </dl>

            <div class="analytics-table-wrap">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>{{ t("adminAnalytics.funnelStepColumn") }}</th>
                    <th>{{ t("adminAnalytics.journeysColumn") }}</th>
                    <th>{{ t("adminAnalytics.eventsColumn") }}</th>
                    <th>{{ t("adminAnalytics.previousRateLabel") }}</th>
                    <th>{{ t("adminAnalytics.startRateLabel") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="step in prCreateFunnel.steps" :key="step.stepKey">
                    <td>
                      <strong>{{ step.label }}</strong>
                      <span class="analytics-table__hint">
                        {{ step.behavior }}
                      </span>
                    </td>
                    <td>{{ formatCount(step.journeyCount) }}</td>
                    <td>{{ formatCount(step.eventCount) }}</td>
                    <td>{{ formatNullableRate(step.conversionFromPrevious) }}</td>
                    <td>{{ formatRate(step.conversionFromStart) }}</td>
                  </tr>
                  <tr v-if="prCreateFunnel.steps.length === 0">
                    <td colspan="5">{{ t("adminAnalytics.emptyTable") }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

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
                  <tr v-for="row in prCreateFunnel.paths" :key="row.creationPath">
                    <td>{{ formatCreatePath(row.creationPath) }}</td>
                    <td>{{ formatCount(row.journeyCount) }}</td>
                    <td>{{ formatCount(row.eventCount) }}</td>
                  </tr>
                  <tr v-if="prCreateFunnel.paths.length === 0">
                    <td colspan="3">{{ t("adminAnalytics.emptyTable") }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="projection-footnote">
              {{
                t("adminAnalytics.prCreateProjectionContextDetail", {
                  events: formatCount(prCreateFunnel.context.eventCount),
                  route: formatCount(prCreateFunnel.context.routeContextUnknownEvents),
                  auth: formatCount(prCreateFunnel.context.authContextUnknownEvents),
                  authenticated: formatCount(prCreateFunnel.identity.authenticatedJourneys),
                  unknown: formatCount(prCreateFunnel.identity.unknownSessionJourneys),
                })
              }}
            </p>
          </section>

          <section
            v-if="showsPRFunnelDashboard && prJoinFunnel"
            class="analytics-panel"
            data-testid="admin-analytics.pr-join-funnel"
          >
            <div class="analytics-panel__header">
              <div>
                <h2>{{ t("adminAnalytics.prJoinFunnelTitle") }}</h2>
                <p>{{ t("adminAnalytics.prJoinFunnelSubtitle") }}</p>
              </div>
            </div>

            <dl class="nudge-summary-grid">
              <div v-for="item in prJoinSummaryItems" :key="item.key">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
                <span>{{ item.detail }}</span>
              </div>
            </dl>

            <div class="analytics-table-wrap">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>{{ t("adminAnalytics.funnelStepColumn") }}</th>
                    <th>{{ t("adminAnalytics.journeysColumn") }}</th>
                    <th>{{ t("adminAnalytics.eventsColumn") }}</th>
                    <th>{{ t("adminAnalytics.previousRateLabel") }}</th>
                    <th>{{ t("adminAnalytics.startRateLabel") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="step in prJoinFunnel.steps" :key="step.stepKey">
                    <td>
                      <strong>{{ step.label }}</strong>
                      <span class="analytics-table__hint">
                        {{ step.behavior }}
                      </span>
                    </td>
                    <td>{{ formatCount(step.journeyCount) }}</td>
                    <td>{{ formatCount(step.eventCount) }}</td>
                    <td>{{ formatNullableRate(step.conversionFromPrevious) }}</td>
                    <td>{{ formatRate(step.conversionFromStart) }}</td>
                  </tr>
                  <tr v-if="prJoinFunnel.steps.length === 0">
                    <td colspan="5">{{ t("adminAnalytics.emptyTable") }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p class="projection-footnote">
              {{
                t("adminAnalytics.prJoinProjectionContextDetail", {
                  events: formatCount(prJoinFunnel.context.eventCount),
                  route: formatCount(prJoinFunnel.context.routeContextUnknownEvents),
                  auth: formatCount(prJoinFunnel.context.authContextUnknownEvents),
                  authenticated: formatCount(prJoinFunnel.identity.authenticatedJourneys),
                  unknown: formatCount(prJoinFunnel.identity.unknownSessionJourneys),
                })
              }}
            </p>
          </section>

          <section
            v-if="showsPRDiscoveryDashboard && dashboard"
            class="analytics-panel"
            data-testid="admin-analytics.pr-discovery-funnel"
          >
            <div class="analytics-panel__header">
              <div>
                <h2>{{ t("adminAnalytics.prDiscoveryFunnelTitle") }}</h2>
                <p>{{ t("adminAnalytics.prDiscoveryFunnelSubtitle") }}</p>
              </div>
            </div>

            <div class="analytics-table-wrap">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>{{ t("adminAnalytics.funnelStepColumn") }}</th>
                    <th>{{ t("adminAnalytics.journeysColumn") }}</th>
                    <th>{{ t("adminAnalytics.eventsColumn") }}</th>
                    <th>{{ t("adminAnalytics.previousRateLabel") }}</th>
                    <th>{{ t("adminAnalytics.startRateLabel") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="step in dashboard.steps" :key="step.stepKey">
                    <td>
                      <strong>{{ step.label }}</strong>
                    </td>
                    <td>{{ formatCount(step.journeyCount) }}</td>
                    <td>{{ formatCount(step.eventCount) }}</td>
                    <td>{{ formatNullableRate(step.conversionFromPrevious) }}</td>
                    <td>{{ formatRate(step.conversionFromStart) }}</td>
                  </tr>
                  <tr v-if="dashboard.steps.length === 0">
                    <td colspan="5">{{ t("adminAnalytics.emptyTable") }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

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
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuFormItem,
  PuInlineNotice,
  PuInput,
  PuLoadingState,
  PuSelect,
  type PuSelectOption,
  type PuSelectValue,
} from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import {
  type AdminAnalyticsFunnelQuery,
  type AdminBIOverviewResponse,
  type AdminPRCreateFunnelResponse,
  type AdminPRDiscoveryFunnelResponse,
  type AdminPRJoinFunnelResponse,
  useAdminBIOverviewAnalytics,
  useAdminPRCreateFunnelAnalytics,
  useAdminPRDiscoveryFunnelAnalytics,
  useAdminPRJoinFunnelAnalytics,
} from "@/domains/admin/queries/useAdminAnalytics";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";

type BIOverviewRetentionRow = AdminBIOverviewResponse["retention"]["rows"][number];
type BIOverviewStatusRow = AdminBIOverviewResponse["prLifecycle"]["statusRows"][number];
type PRCreateFunnelSummary = AdminPRCreateFunnelResponse["summary"];
type PRCreatePath = AdminPRCreateFunnelResponse["paths"][number]["creationPath"];
type PRJoinFunnelSummary = AdminPRJoinFunnelResponse["summary"];
type AnalyticsDashboardKind = "overview" | "pr-funnels" | "pr-discovery";

const viewModeOptionsList = ["FORM", "CARD", "LIST"] as const;
type PRDiscoveryViewMode = (typeof viewModeOptionsList)[number];

const { t } = useI18n();
const route = useRoute();
const { logout } = useAdminAccess();

const activeDashboard = computed<AnalyticsDashboardKind>(() => {
  switch (route.name) {
    case "admin-analytics-pr-funnels":
      return "pr-funnels";
    case "admin-analytics-pr-discovery":
      return "pr-discovery";
    case "admin-analytics-overview":
    default:
      return "overview";
  }
});

const showsOverviewDashboard = computed(() => activeDashboard.value === "overview");
const showsPRFunnelDashboard = computed(() => activeDashboard.value === "pr-funnels");
const showsPRDiscoveryDashboard = computed(() => activeDashboard.value === "pr-discovery");

const toLocalInputValue = (date: Date): string => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const createDefaultRange = (): { startAt: string; endAt: string } => {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1_000);
  return {
    startAt: toLocalInputValue(start),
    endAt: toLocalInputValue(end),
  };
};

const parseLocalInputValue = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const defaultRange = createDefaultRange();
const draftStartAt = ref(defaultRange.startAt);
const draftEndAt = ref(defaultRange.endAt);
const draftPRType = ref("");
const draftOrigin = ref("");
const draftViewMode = ref<PRDiscoveryViewMode | "">("");
const filterError = ref<string | null>(null);
const refreshPending = ref(false);

const isViewMode = (value: PuSelectValue): value is PRDiscoveryViewMode =>
  typeof value === "string" && viewModeOptionsList.includes(value as PRDiscoveryViewMode);

const viewModeOptions = computed<PuSelectOption[]>(() => [
  { label: t("adminAnalytics.allModesOption"), value: "" },
  ...viewModeOptionsList.map((mode) => ({
    label: mode,
    value: mode,
  })),
]);

const draftViewModeModel = computed({
  get: () => draftViewMode.value,
  set: (value: PuSelectValue) => {
    draftViewMode.value = isViewMode(value) ? value : "";
  },
});

const appliedQuery = ref<AdminAnalyticsFunnelQuery>({
  startAt: parseLocalInputValue(defaultRange.startAt)?.toISOString(),
  endAt: parseLocalInputValue(defaultRange.endAt)?.toISOString(),
});

const analyticsQuery = useAdminPRDiscoveryFunnelAnalytics(appliedQuery, {
  enabled: showsPRDiscoveryDashboard,
});
const biOverviewQuery = useAdminBIOverviewAnalytics(appliedQuery, {
  enabled: showsOverviewDashboard,
});
const prCreateFunnelQuery = useAdminPRCreateFunnelAnalytics(appliedQuery, {
  enabled: showsPRFunnelDashboard,
});
const prJoinFunnelQuery = useAdminPRJoinFunnelAnalytics(appliedQuery, {
  enabled: showsPRFunnelDashboard,
});
const dashboard = computed<AdminPRDiscoveryFunnelResponse | null>(
  () => analyticsQuery.data.value ?? null,
);
const biOverview = computed(() => biOverviewQuery.data.value ?? null);
const prCreateFunnel = computed(() => prCreateFunnelQuery.data.value ?? null);
const prJoinFunnel = computed(() => prJoinFunnelQuery.data.value ?? null);
const isInitialLoading = computed(
  () =>
    (showsPRDiscoveryDashboard.value && analyticsQuery.isLoading.value) ||
    (showsOverviewDashboard.value && biOverviewQuery.isLoading.value) ||
    (showsPRFunnelDashboard.value &&
      (prCreateFunnelQuery.isLoading.value || prJoinFunnelQuery.isLoading.value)),
);
const dashboardError = computed(
  () =>
    (showsPRDiscoveryDashboard.value ? analyticsQuery.error.value : null) ??
    (showsOverviewDashboard.value ? biOverviewQuery.error.value : null) ??
    (showsPRFunnelDashboard.value
      ? (prCreateFunnelQuery.error.value ?? prJoinFunnelQuery.error.value)
      : null) ??
    null,
);
const hasDashboardData = computed(
  () =>
    (showsOverviewDashboard.value && biOverview.value !== null) ||
    (showsPRFunnelDashboard.value &&
      (prCreateFunnel.value !== null || prJoinFunnel.value !== null)) ||
    (showsPRDiscoveryDashboard.value && dashboard.value !== null),
);
const isDashboardRefreshing = computed(
  () =>
    refreshPending.value ||
    (showsPRDiscoveryDashboard.value && analyticsQuery.isFetching.value) ||
    (showsOverviewDashboard.value && biOverviewQuery.isFetching.value) ||
    (showsPRFunnelDashboard.value &&
      (prCreateFunnelQuery.isFetching.value || prJoinFunnelQuery.isFetching.value)),
);

const numberFormatter = new Intl.NumberFormat("zh-CN");
const percentFormatter = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  maximumFractionDigits: 1,
});
const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const formatCount = (value: number): string => numberFormatter.format(value);
const formatRate = (value: number): string => percentFormatter.format(value);
const formatNullableRate = (value: number | null): string =>
  value === null ? "-" : formatRate(value);
const formatPRStatus = (status: BIOverviewStatusRow["status"]): string =>
  t(`adminAnalytics.prStatus.${status}`);
const formatCreatePath = (path: PRCreatePath): string => t(`adminAnalytics.prCreatePath.${path}`);

const prDiscoverySummaryItems = computed(() => {
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

const latestRetentionRow = computed<BIOverviewRetentionRow | null>(() => {
  const rows = biOverview.value?.retention.rows ?? [];
  return rows[rows.length - 1] ?? null;
});

const visibleRetentionRows = computed(() => (biOverview.value?.retention.rows ?? []).slice(-7));

const biOverviewItems = computed(() => {
  const overview = biOverview.value;
  if (!overview) return [];
  const latestRetention = latestRetentionRow.value;
  return [
    {
      key: "retention",
      label: t("adminAnalytics.biRetentionMetric"),
      value: latestRetention ? formatRate(latestRetention.retentionRate7Days) : formatRate(0),
      detail: latestRetention
        ? t("adminAnalytics.biRetentionDetail", {
            date: latestRetention.cohortDate,
            active: formatCount(latestRetention.activeUsers),
          })
        : t("adminAnalytics.emptyTable"),
    },
    {
      key: "createdPRs",
      label: t("adminAnalytics.biCreatedPRMetric"),
      value: formatCount(overview.userPRCounts.createdPRs),
      detail: t("adminAnalytics.biCreatedPRDetail", {
        users: formatCount(overview.userPRCounts.creatorUsers),
      }),
    },
    {
      key: "lifecycle",
      label: t("adminAnalytics.biLifecycleMetric"),
      value: formatCount(overview.prLifecycle.formedPRs),
      detail: t("adminAnalytics.biLifecycleDetail", {
        closed: formatCount(overview.prLifecycle.timeWindowEndAtCohort.closedPRs),
        expired: formatCount(overview.prLifecycle.timeWindowEndAtCohort.expiredPRs),
      }),
    },
  ];
});

const prJoinSummaryItems = computed(() => {
  const summary = prJoinFunnel.value?.summary;
  if (!summary) return [];
  const items: Array<{
    key: keyof PRJoinFunnelSummary;
    label: string;
    value: string;
    detail: string;
  }> = [
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
  return items;
});

const prCreateSummaryItems = computed(() => {
  const summary = prCreateFunnel.value?.summary;
  if (!summary) return [];
  const items: Array<{
    key: keyof PRCreateFunnelSummary;
    label: string;
    value: string;
    detail: string;
  }> = [
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
  return items;
});

const activeFilterSummary = computed(() => {
  const filters = dashboard.value?.filters ?? appliedQuery.value;
  const start = filters.startAt ? dateTimeFormatter.format(new Date(filters.startAt)) : "-";
  const end = filters.endAt ? dateTimeFormatter.format(new Date(filters.endAt)) : "-";
  return t("adminAnalytics.activeTimeFilterSummary", {
    start,
    end,
    mode: filters.viewMode ?? t("adminAnalytics.allModesOption"),
  });
});

const buildDraftQuery = (): AdminAnalyticsFunnelQuery | null => {
  const startAt = parseLocalInputValue(draftStartAt.value);
  const endAt = parseLocalInputValue(draftEndAt.value);
  if (!startAt || !endAt) {
    filterError.value = t("adminAnalytics.invalidDateRange");
    return null;
  }
  if (startAt.getTime() >= endAt.getTime()) {
    filterError.value = t("adminAnalytics.invalidDateOrder");
    return null;
  }

  filterError.value = null;
  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    prType: draftPRType.value.trim() || null,
    viewMode: draftViewMode.value || null,
    origin: draftOrigin.value.trim() || null,
  };
};

const applyFilters = (): void => {
  const nextQuery = buildDraftQuery();
  if (!nextQuery) return;
  appliedQuery.value = nextQuery;
};

const resetFilters = (): void => {
  const range = createDefaultRange();
  draftStartAt.value = range.startAt;
  draftEndAt.value = range.endAt;
  draftPRType.value = "";
  draftOrigin.value = "";
  draftViewMode.value = "";
  filterError.value = null;
  appliedQuery.value = {
    startAt: parseLocalInputValue(range.startAt)?.toISOString(),
    endAt: parseLocalInputValue(range.endAt)?.toISOString(),
  };
};

const refreshDashboard = async (): Promise<void> => {
  refreshPending.value = true;
  try {
    const refetches: Array<Promise<unknown>> = [];
    if (showsPRDiscoveryDashboard.value) {
      refetches.push(analyticsQuery.refetch());
    }
    if (showsOverviewDashboard.value) {
      refetches.push(biOverviewQuery.refetch());
    }
    if (showsPRFunnelDashboard.value) {
      refetches.push(prCreateFunnelQuery.refetch(), prJoinFunnelQuery.refetch());
    }
    await Promise.all(refetches);
  } finally {
    refreshPending.value = false;
  }
};
</script>

<style lang="scss" scoped>
.admin-analytics-page {
  --analytics-border: 1px solid var(--sys-color-outline-variant);
}

.analytics-filter-rail,
.analytics-dashboard,
.analytics-filter-rail__header,
.analytics-filter-rail__actions,
.analytics-panel,
.analytics-panel__header,
.funnel-panel,
.funnel-panel__header,
.funnel-steps,
.funnel-step__body,
.funnel-step__metrics,
.nudge-summary-grid,
.nudge-summary-grid > div,
.kpi-card {
  min-width: 0;
}

.analytics-filter-rail,
.analytics-dashboard,
.analytics-filter-rail__header,
.analytics-filter-rail__actions,
.analytics-panel,
.funnel-panel,
.funnel-steps,
.funnel-step__body,
.funnel-step__metrics,
.nudge-summary-grid > div,
.kpi-card {
  display: flex;
  flex-direction: column;
}

.analytics-filter-rail {
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-medium);
  border: var(--analytics-border);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}

.analytics-filter-rail__header {
  gap: var(--sys-spacing-xsmall);
}

.analytics-filter-rail__eyebrow,
.analytics-filter-rail__summary,
.analytics-panel h2,
.analytics-panel p,
.funnel-panel h2,
.funnel-panel p,
.funnel-step p,
.funnel-step__metrics dt,
.funnel-step__metrics dd,
.nudge-summary-grid dt,
.nudge-summary-grid dd,
.nudge-summary-grid span,
.kpi-card__label,
.kpi-card__detail {
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

.analytics-panel p,
.projection-footnote,
.funnel-panel__header span,
.funnel-step p,
.funnel-step__metrics dt,
.nudge-summary-grid dt,
.nudge-summary-grid span,
.kpi-card__detail {
  color: var(--sys-color-on-surface-variant);
}

.analytics-dashboard {
  gap: var(--sys-spacing-large);
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
}

.kpi-card {
  gap: var(--sys-spacing-xsmall);
  min-height: 116px;
  padding: var(--sys-spacing-medium);
  border: var(--analytics-border);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container);
}

.kpi-card__label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.kpi-card__value {
  @include mx.pu-font(hero);
  color: var(--sys-color-on-surface);
}

.kpi-card__detail {
  @include mx.pu-font(support);
}

.analytics-panel,
.funnel-panel {
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-medium);
  border: var(--analytics-border);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-lowest);
}

.analytics-panel__header,
.funnel-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.analytics-panel h2,
.funnel-panel h2 {
  @include mx.pu-font(title);
}

.analytics-panel p {
  @include mx.pu-font(body);
}

.projection-footnote {
  @include mx.pu-font(support);
}

.nudge-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
  padding: 0;
  margin: 0;
}

.nudge-summary-grid > div {
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container);
}

.nudge-summary-grid--compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.nudge-summary-grid dt,
.nudge-summary-grid span {
  @include mx.pu-font(caption);
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
  vertical-align: middle;
}

.analytics-table th {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.analytics-table tbody tr {
  transition: background-color 160ms ease;
}

.analytics-table tbody tr.is-active,
.analytics-table tbody tr.is-clickable:hover,
.analytics-table tbody tr[tabindex]:focus-visible {
  background: var(--sys-color-surface-container);
}

.analytics-table tbody tr[tabindex] {
  cursor: pointer;
}

.analytics-table__hint {
  @include mx.pu-font(support);
  display: block;
  margin-top: calc(var(--sys-spacing-xsmall) / 2);
  color: var(--sys-color-on-surface-variant);
}

.funnel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
}

.funnel-panel.is-focused {
  border-color: var(--sys-color-primary);
}

.funnel-steps {
  gap: var(--sys-spacing-medium);
  padding: 0;
  margin: 0;
  list-style: none;
}

.funnel-step {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: var(--sys-spacing-medium);
  align-items: start;
  padding-bottom: var(--sys-spacing-medium);
  border-bottom: 1px solid var(--sys-color-outline-variant);
}

.funnel-step:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.funnel-step__body {
  gap: var(--sys-spacing-xsmall);
}

.funnel-step__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.funnel-step__bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--sys-color-surface-container);
}

.funnel-step__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--sys-color-primary);
}

.funnel-step__metrics {
  gap: var(--sys-spacing-xsmall);
}

.funnel-step__metrics div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.funnel-step__metrics dt,
.funnel-step__metrics dd {
  @include mx.pu-font(caption);
}

.funnel-step__metrics dd {
  color: var(--sys-color-on-surface);
}

.analytics-lower-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
}

@media (max-width: 1180px) {
  .kpi-strip,
  .funnel-grid,
  .nudge-summary-grid,
  .analytics-lower-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .kpi-strip,
  .funnel-grid,
  .nudge-summary-grid,
  .analytics-lower-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .funnel-step {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .analytics-table tbody tr,
  .funnel-step__bar span {
    transition: none !important;
  }
}
</style>
