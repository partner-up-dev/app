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

        <FormField :label="t('adminAnalytics.startAtLabel')" for-id="analytics-start-at">
          <input
            id="analytics-start-at"
            v-model="draftStartAt"
            class="analytics-input"
            type="datetime-local"
          />
        </FormField>

        <FormField :label="t('adminAnalytics.endAtLabel')" for-id="analytics-end-at">
          <input
            id="analytics-end-at"
            v-model="draftEndAt"
            class="analytics-input"
            type="datetime-local"
          />
        </FormField>

        <FormField :label="t('adminAnalytics.eventIdLabel')" for-id="analytics-event-id">
          <input
            id="analytics-event-id"
            v-model="draftEventId"
            class="analytics-input"
            inputmode="numeric"
            type="text"
            :placeholder="t('adminAnalytics.allEventsPlaceholder')"
          />
        </FormField>

        <FormField :label="t('adminAnalytics.sourceSpmLabel')" for-id="analytics-spm">
          <input
            id="analytics-spm"
            v-model="draftSpm"
            class="analytics-input"
            type="text"
            :placeholder="t('adminAnalytics.sourceSpmPlaceholder')"
          />
        </FormField>

        <FormField :label="t('adminAnalytics.sourceQrLabel')" for-id="analytics-source-qr">
          <input
            id="analytics-source-qr"
            v-model="draftSourceQr"
            class="analytics-input"
            type="text"
            :placeholder="t('adminAnalytics.sourceQrPlaceholder')"
          />
        </FormField>

        <FormField
          :label="t('adminAnalytics.assignmentRevisionLabel')"
          for-id="analytics-assignment-revision"
        >
          <input
            id="analytics-assignment-revision"
            v-model="draftAssignmentRevision"
            class="analytics-input"
            type="text"
            :placeholder="t('adminAnalytics.assignmentRevisionPlaceholder')"
          />
        </FormField>

        <FormField :label="t('adminAnalytics.renderedModeLabel')" for-id="analytics-mode">
          <select
            id="analytics-mode"
            v-model="draftRenderedMode"
            class="analytics-input"
          >
            <option value="">{{ t("adminAnalytics.allModesOption") }}</option>
            <option v-for="mode in modeOptions" :key="mode" :value="mode">
              {{ formatMode(mode) }}
            </option>
          </select>
        </FormField>

        <InlineNotice
          v-if="filterError"
          tone="error"
          :message="filterError"
          data-testid="admin-analytics.filters.error"
        />

        <div class="analytics-filter-rail__actions">
          <Button
            appearance="rect"
            tone="primary"
            type="button"
            data-testid="admin-analytics.filters.apply"
            @click="applyFilters"
          >
            <template #leading>
              <span class="i-mdi-filter-check" aria-hidden="true"></span>
            </template>
            {{ t("adminAnalytics.applyFiltersAction") }}
          </Button>
          <Button
            appearance="rect"
            tone="outline"
            type="button"
            data-testid="admin-analytics.filters.reset"
            @click="resetFilters"
          >
            <template #leading>
              <span class="i-mdi-refresh" aria-hidden="true"></span>
            </template>
            {{ t("adminAnalytics.resetFiltersAction") }}
          </Button>
        </div>
      </aside>
    </template>

    <template #actions>
      <Button
        appearance="pill"
        tone="surface"
        size="sm"
        type="button"
        :loading="isDashboardRefreshing"
        data-testid="admin-analytics.refresh"
        @click="refreshDashboard"
      >
        <template #leading>
          <span class="i-mdi-sync" aria-hidden="true"></span>
        </template>
        {{ t("adminAnalytics.refreshAction") }}
      </Button>
    </template>

    <template #main>
      <div class="analytics-dashboard" data-testid="admin-analytics.dashboard">
        <LoadingIndicator
          v-if="analyticsQuery.isLoading.value"
          :message="t('adminAnalytics.loading')"
        />
        <InlineNotice
          v-else-if="analyticsQuery.error.value"
          tone="error"
          :title="t('adminAnalytics.loadFailedTitle')"
          :message="analyticsQuery.error.value.message"
          data-testid="admin-analytics.error"
        />

        <template v-else-if="dashboard">
          <section class="kpi-strip" data-testid="admin-analytics.summary">
            <article
              v-for="item in summaryItems"
              :key="item.key"
              class="kpi-card"
            >
              <span class="kpi-card__label">{{ item.label }}</span>
              <strong class="kpi-card__value">{{ item.value }}</strong>
              <span v-if="item.detail" class="kpi-card__detail">
                {{ item.detail }}
              </span>
            </article>
          </section>

          <section class="analytics-panel" data-testid="admin-analytics.modes">
            <div class="analytics-panel__header">
              <div>
                <h2>{{ t("adminAnalytics.modeComparisonTitle") }}</h2>
                <p>{{ t("adminAnalytics.modeComparisonSubtitle") }}</p>
              </div>
            </div>

            <div class="analytics-table-wrap">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>{{ t("adminAnalytics.modeColumn") }}</th>
                    <th>{{ t("adminAnalytics.journeysColumn") }}</th>
                    <th>{{ t("adminAnalytics.exposureColumn") }}</th>
                    <th>{{ t("adminAnalytics.entryColumn") }}</th>
                    <th>{{ t("adminAnalytics.commitmentColumn") }}</th>
                    <th>{{ t("adminAnalytics.rateColumn") }}</th>
                    <th>{{ t("adminAnalytics.outcomeColumn") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in dashboard.modes"
                    :key="row.renderedMode"
                    :class="{ 'is-active': focusedMode === row.renderedMode }"
                    tabindex="0"
                    @click="focusMode(row.renderedMode)"
                    @keydown.enter="focusMode(row.renderedMode)"
                  >
                    <td>{{ formatMode(row.renderedMode) }}</td>
                    <td>{{ formatCount(row.journeys) }}</td>
                    <td>{{ formatCount(row.prExposureJourneys) }}</td>
                    <td>{{ formatCount(row.prEntryJourneys) }}</td>
                    <td>{{ formatCount(row.prCommitmentJourneys) }}</td>
                    <td>{{ formatRate(row.commitmentRate) }}</td>
                    <td>
                      {{ formatOutcomeShort(row) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="funnel-grid" data-testid="admin-analytics.funnels">
            <article
              v-for="funnel in visibleFunnels"
              :key="funnel.renderedMode"
              class="funnel-panel"
              :class="{ 'is-focused': focusedMode === funnel.renderedMode }"
            >
              <div class="funnel-panel__header">
                <h2>{{ formatMode(funnel.renderedMode) }}</h2>
                <span>{{ t("adminAnalytics.funnelStepCount", { count: funnel.steps.length }) }}</span>
              </div>

              <ol class="funnel-steps">
                <li
                  v-for="step in funnel.steps"
                  :key="step.stepKey"
                  class="funnel-step"
                >
                  <div class="funnel-step__main">
                    <div class="funnel-step__title-row">
                      <strong>{{ step.label }}</strong>
                      <span>{{ formatCount(step.journeyCount) }}</span>
                    </div>
                    <p>{{ step.behavior }}</p>
                    <div
                      class="funnel-step__bar"
                      :aria-label="formatRate(step.conversionFromStart)"
                    >
                      <span
                        :style="{ width: formatBarWidth(step.conversionFromStart) }"
                      ></span>
                    </div>
                  </div>
                  <dl class="funnel-step__metrics">
                    <div>
                      <dt>{{ t("adminAnalytics.eventCountLabel") }}</dt>
                      <dd>{{ formatCount(step.eventCount) }}</dd>
                    </div>
                    <div>
                      <dt>{{ t("adminAnalytics.previousRateLabel") }}</dt>
                      <dd>{{ formatNullableRate(step.conversionFromPrevious) }}</dd>
                    </div>
                    <div>
                      <dt>{{ t("adminAnalytics.startRateLabel") }}</dt>
                      <dd>{{ formatRate(step.conversionFromStart) }}</dd>
                    </div>
                  </dl>
                </li>
              </ol>
            </article>
          </section>

          <div class="analytics-lower-grid">
            <section class="analytics-panel" data-testid="admin-analytics.outcomes">
              <div class="analytics-panel__header">
                <div>
                  <h2>{{ t("adminAnalytics.outcomeBreakdownTitle") }}</h2>
                  <p>{{ t("adminAnalytics.outcomeBreakdownSubtitle") }}</p>
                </div>
              </div>
              <div class="analytics-table-wrap">
                <table class="analytics-table">
                  <thead>
                    <tr>
                      <th>{{ t("adminAnalytics.modeColumn") }}</th>
                      <th>{{ t("adminAnalytics.commitmentTypeColumn") }}</th>
                      <th>{{ t("adminAnalytics.resultColumn") }}</th>
                      <th>{{ t("adminAnalytics.journeysColumn") }}</th>
                      <th>{{ t("adminAnalytics.eventsColumn") }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in dashboard.outcomes" :key="formatOutcomeKey(row)">
                      <td>{{ formatMode(row.renderedMode) }}</td>
                      <td>{{ formatCommitmentType(row.commitmentType) }}</td>
                      <td>
                        <span class="status-pill" :class="`status-pill--${row.actionResult}`">
                          {{ formatActionResult(row.actionResult) }}
                        </span>
                      </td>
                      <td>{{ formatCount(row.journeyCount) }}</td>
                      <td>{{ formatCount(row.eventCount) }}</td>
                    </tr>
                    <tr v-if="dashboard.outcomes.length === 0">
                      <td colspan="5">{{ t("adminAnalytics.emptyTable") }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="analytics-panel" data-testid="admin-analytics.sources">
              <div class="analytics-panel__header">
                <div>
                  <h2>{{ t("adminAnalytics.sourceBreakdownTitle") }}</h2>
                  <p>{{ t("adminAnalytics.sourceBreakdownSubtitle") }}</p>
                </div>
              </div>
              <div class="analytics-table-wrap">
                <table class="analytics-table">
                  <thead>
                    <tr>
                      <th>{{ t("adminAnalytics.sourceColumn") }}</th>
                      <th>{{ t("adminAnalytics.modeColumn") }}</th>
                      <th>{{ t("adminAnalytics.journeysColumn") }}</th>
                      <th>{{ t("adminAnalytics.commitmentColumn") }}</th>
                      <th>{{ t("adminAnalytics.rateColumn") }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in dashboard.sources"
                      :key="`${row.renderedMode}:${row.sourceType}:${row.sourceKey}`"
                      :class="{ 'is-clickable': row.sourceType === 'start_spm' }"
                      :tabindex="row.sourceType === 'start_spm' ? 0 : undefined"
                      @click="applySourceFilter(row)"
                      @keydown.enter="applySourceFilter(row)"
                    >
                      <td>{{ row.sourceKey }}</td>
                      <td>{{ formatMode(row.renderedMode) }}</td>
                      <td>{{ formatCount(row.journeys) }}</td>
                      <td>{{ formatCount(row.prCommitmentJourneys) }}</td>
                      <td>{{ formatRate(row.commitmentRate) }}</td>
                    </tr>
                    <tr v-if="dashboard.sources.length === 0">
                      <td colspan="5">{{ t("adminAnalytics.emptyTable") }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section class="analytics-panel" data-testid="admin-analytics.failures">
            <div class="analytics-panel__header">
              <div>
                <h2>{{ t("adminAnalytics.failureBreakdownTitle") }}</h2>
                <p>{{ t("adminAnalytics.failureBreakdownSubtitle") }}</p>
              </div>
            </div>
            <div class="analytics-table-wrap">
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>{{ t("adminAnalytics.modeColumn") }}</th>
                    <th>{{ t("adminAnalytics.eventNameColumn") }}</th>
                    <th>{{ t("adminAnalytics.commitmentTypeColumn") }}</th>
                    <th>{{ t("adminAnalytics.failureCodeColumn") }}</th>
                    <th>{{ t("adminAnalytics.failureReasonColumn") }}</th>
                    <th>{{ t("adminAnalytics.journeysColumn") }}</th>
                    <th>{{ t("adminAnalytics.eventsColumn") }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in dashboard.failures" :key="formatFailureKey(row)">
                    <td>{{ formatMode(row.renderedMode) }}</td>
                    <td>{{ row.eventName }}</td>
                    <td>{{ row.commitmentType ? formatCommitmentType(row.commitmentType) : "-" }}</td>
                    <td>{{ row.failureCode }}</td>
                    <td>{{ row.failureReason ?? "-" }}</td>
                    <td>{{ formatCount(row.journeyCount) }}</td>
                    <td>{{ formatCount(row.eventCount) }}</td>
                  </tr>
                  <tr v-if="dashboard.failures.length === 0">
                    <td colspan="7">{{ t("adminAnalytics.emptyFailures") }}</td>
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
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorEventAnalyticsRenderedMode } from "@partner-up-dev/backend";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  useAdminAnchorEventFunnelAnalytics,
  type AdminAnalyticsFunnelQuery,
  type AdminAnalyticsFunnelResponse,
} from "@/domains/admin/queries/useAdminAnalytics";
import Button from "@/shared/ui/actions/Button.vue";
import FormField from "@/shared/ui/forms/FormField.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";

type ModeComparisonRow = AdminAnalyticsFunnelResponse["modes"][number];
type SourceBreakdownRow = AdminAnalyticsFunnelResponse["sources"][number];
type OutcomeBreakdownRow = AdminAnalyticsFunnelResponse["outcomes"][number];
type FailureBreakdownRow = AdminAnalyticsFunnelResponse["failures"][number];

const modeOptions: AnchorEventAnalyticsRenderedMode[] = [
  "FORM",
  "CARD_RICH",
  "LIST",
];

const MODE_LABELS: Record<AnchorEventAnalyticsRenderedMode, string> = {
  FORM: "FORM",
  CARD_RICH: "CARD_RICH",
  LIST: "LIST",
};

const { t } = useI18n();
const { logout } = useAdminAccess();

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
const draftEventId = ref("");
const draftSpm = ref("");
const draftSourceQr = ref("");
const draftAssignmentRevision = ref("");
const draftRenderedMode = ref<AnchorEventAnalyticsRenderedMode | "">("");
const filterError = ref<string | null>(null);
const focusedMode = ref<AnchorEventAnalyticsRenderedMode | null>(null);
const refreshPending = ref(false);

const appliedQuery = ref<AdminAnalyticsFunnelQuery>({
  startAt: parseLocalInputValue(defaultRange.startAt)?.toISOString(),
  endAt: parseLocalInputValue(defaultRange.endAt)?.toISOString(),
});

const analyticsQuery = useAdminAnchorEventFunnelAnalytics(appliedQuery);
const dashboard = computed(() => analyticsQuery.data.value ?? null);
const isDashboardRefreshing = computed(
  () => refreshPending.value || analyticsQuery.isFetching.value,
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
const formatMode = (mode: AnchorEventAnalyticsRenderedMode): string =>
  MODE_LABELS[mode];
const formatCommitmentType = (
  type: OutcomeBreakdownRow["commitmentType"],
): string => t(`adminAnalytics.commitmentType.${type}`);
const formatActionResult = (result: OutcomeBreakdownRow["actionResult"]): string =>
  t(`adminAnalytics.actionResult.${result}`);

const formatBarWidth = (rate: number): string =>
  `${Math.max(0, Math.min(100, rate * 100)).toFixed(2)}%`;

const formatOutcomeShort = (row: ModeComparisonRow): string =>
  t("adminAnalytics.outcomeShort", {
    create: formatCount(row.createSuccess),
    join: formatCount(row.joinSuccess),
    waitlist: formatCount(row.waitlistSuccess),
  });

const summaryItems = computed(() => {
  const summary = dashboard.value?.summary;
  if (!summary) return [];
  return [
    {
      key: "journeys",
      label: t("adminAnalytics.summaryJourneys"),
      value: formatCount(summary.journeys),
      detail: t("adminAnalytics.summaryJourneysDetail"),
    },
    {
      key: "exposure",
      label: t("adminAnalytics.summaryExposure"),
      value: formatCount(summary.prExposureJourneys),
      detail: t("adminAnalytics.summaryExposureDetail"),
    },
    {
      key: "entry",
      label: t("adminAnalytics.summaryEntry"),
      value: formatCount(summary.prEntryJourneys),
      detail: t("adminAnalytics.summaryEntryDetail"),
    },
    {
      key: "commitment",
      label: t("adminAnalytics.summaryCommitment"),
      value: formatCount(summary.prCommitmentJourneys),
      detail: t("adminAnalytics.summaryCommitmentDetail", {
        rate: formatRate(summary.commitmentRate),
      }),
    },
    {
      key: "create",
      label: t("adminAnalytics.summaryCreate"),
      value: formatCount(summary.createSuccess),
      detail: t("adminAnalytics.summarySuccessDetail"),
    },
    {
      key: "join",
      label: t("adminAnalytics.summaryJoin"),
      value: formatCount(summary.joinSuccess),
      detail: t("adminAnalytics.summarySuccessDetail"),
    },
    {
      key: "waitlist",
      label: t("adminAnalytics.summaryWaitlist"),
      value: formatCount(summary.waitlistSuccess),
      detail: t("adminAnalytics.summarySuccessDetail"),
    },
  ];
});

const visibleFunnels = computed(() => {
  const funnels = dashboard.value?.funnels ?? [];
  if (!focusedMode.value) return funnels;
  return funnels.filter((funnel) => funnel.renderedMode === focusedMode.value);
});

const activeFilterSummary = computed(() => {
  const filters = dashboard.value?.filters ?? appliedQuery.value;
  const start = filters.startAt ? dateTimeFormatter.format(new Date(filters.startAt)) : "-";
  const end = filters.endAt ? dateTimeFormatter.format(new Date(filters.endAt)) : "-";
  return t("adminAnalytics.activeFilterSummary", {
    start,
    end,
    mode: filters.renderedMode ? formatMode(filters.renderedMode) : t("adminAnalytics.allModesOption"),
  });
});

const parseEventId = (): number | null => {
  const raw = draftEventId.value.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
};

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

  const eventId = parseEventId();
  if (Number.isNaN(eventId)) {
    filterError.value = t("adminAnalytics.invalidEventId");
    return null;
  }

  filterError.value = null;
  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    eventId,
    spm: draftSpm.value.trim() || null,
    sourceQr: draftSourceQr.value.trim() || null,
    assignmentRevision: draftAssignmentRevision.value.trim() || null,
    renderedMode: draftRenderedMode.value || null,
  };
};

const applyFilters = (): void => {
  const nextQuery = buildDraftQuery();
  if (!nextQuery) return;
  appliedQuery.value = nextQuery;
  focusedMode.value = nextQuery.renderedMode ?? null;
};

const resetFilters = (): void => {
  const range = createDefaultRange();
  draftStartAt.value = range.startAt;
  draftEndAt.value = range.endAt;
  draftEventId.value = "";
  draftSpm.value = "";
  draftSourceQr.value = "";
  draftAssignmentRevision.value = "";
  draftRenderedMode.value = "";
  filterError.value = null;
  focusedMode.value = null;
  appliedQuery.value = {
    startAt: parseLocalInputValue(range.startAt)?.toISOString(),
    endAt: parseLocalInputValue(range.endAt)?.toISOString(),
  };
};

const refreshDashboard = async (): Promise<void> => {
  refreshPending.value = true;
  try {
    await analyticsQuery.refetch();
  } finally {
    refreshPending.value = false;
  }
};

const focusMode = (mode: AnchorEventAnalyticsRenderedMode): void => {
  focusedMode.value = focusedMode.value === mode ? null : mode;
};

const applySourceFilter = (row: SourceBreakdownRow): void => {
  if (row.sourceType !== "start_spm") return;
  draftSpm.value = row.sourceKey;
  applyFilters();
};

const formatOutcomeKey = (row: OutcomeBreakdownRow): string =>
  `${row.renderedMode}:${row.commitmentType}:${row.actionResult}`;

const formatFailureKey = (row: FailureBreakdownRow): string =>
  `${row.renderedMode}:${row.eventName}:${row.commitmentType ?? "none"}:${row.failureCode}:${row.failureReason ?? ""}`;
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
.funnel-step__main,
.funnel-step__metrics,
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
.funnel-step__main,
.funnel-step__metrics,
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
.kpi-card__label,
.kpi-card__detail {
  margin: 0;
}

.analytics-filter-rail__eyebrow {
  @include mx.pu-font(label-large);
  color: var(--sys-color-primary);
}

.analytics-filter-rail__summary {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.analytics-input {
  @include mx.pu-font(body-medium);
  width: 100%;
  min-height: var(--sys-size-large);
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-lowest);
  color: var(--sys-color-on-surface);
}

.analytics-input:focus {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 1px;
}

.analytics-filter-rail__actions {
  gap: var(--sys-spacing-small);
}

.analytics-panel p,
.funnel-panel__header span,
.funnel-step p,
.funnel-step__metrics dt,
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
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}

.kpi-card__value {
  @include mx.pu-font(display-small);
  color: var(--sys-color-on-surface);
}

.kpi-card__detail {
  @include mx.pu-font(body-small);
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
  @include mx.pu-font(title-large);
}

.analytics-panel p {
  @include mx.pu-font(body-medium);
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

.analytics-table th,
.analytics-table td {
  @include mx.pu-font(body-medium);
  padding: var(--sys-spacing-small);
  border-bottom: 1px solid var(--sys-color-outline-variant);
  text-align: left;
  vertical-align: middle;
}

.analytics-table th {
  @include mx.pu-font(label-medium);
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

.funnel-step__main {
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
  @include mx.pu-font(label-small);
}

.funnel-step__metrics dd {
  color: var(--sys-color-on-surface);
}

.analytics-lower-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-medium);
}

.status-pill {
  @include mx.pu-font(label-small);
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 var(--sys-spacing-small);
  border-radius: 999px;
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
}

.status-pill--success {
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
}

.status-pill--blocked {
  background: var(--sys-color-warning);
  color: var(--sys-color-on-warning);
}

.status-pill--failure {
  background: var(--sys-color-error-container);
  color: var(--sys-color-on-error-container);
}

@media (max-width: 1180px) {
  .kpi-strip,
  .funnel-grid,
  .analytics-lower-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .kpi-strip,
  .funnel-grid,
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
