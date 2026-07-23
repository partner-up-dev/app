<template>
  <AdminPageScaffold class="admin-analytics-page">
    <template #navigation><AdminNavigationPanel show-logout @logout="logout" /></template>
    <template #rail
      ><AnalyticsFilterRail
        :draft="draft"
        :show-discovery-dimensions="false"
        :filter-error="filterError"
        :active-filter-summary="activeFilterSummary"
        @apply="viewModel.filters.apply"
        @reset="viewModel.filters.reset"
    /></template>
    <template #actions
      ><PuButton
        shape="pill"
        tone="neutral"
        variant="soft"
        size="sm"
        :loading="isRefreshing"
        data-testid="admin-analytics.refresh"
        @click="refresh"
        ><template #leading><span class="i-mdi-sync" aria-hidden="true"></span></template
        >{{ t("adminAnalytics.refreshAction") }}</PuButton
      ></template
    >
    <template #main>
      <div class="analytics-dashboard" data-testid="admin-analytics.dashboard">
        <PuLoadingState v-if="isInitialLoading" :message="t('adminAnalytics.loading')" />
        <PuInlineNotice
          v-else-if="error"
          tone="error"
          :title="t('adminAnalytics.loadFailedTitle')"
          :message="error.message"
          data-testid="admin-analytics.error"
        />
        <PRFunnelsSurface v-else :view-model="viewModel" />
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { PuButton, PuInlineNotice, PuLoadingState } from "@partner-up-dev/design-web";
import { useI18n } from "vue-i18n";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AnalyticsFilterRail from "@/domains/analytics/ui/sections/AnalyticsFilterRail.vue";
import PRFunnelsSurface from "@/domains/analytics/ui/surfaces/PRFunnelsSurface.vue";
import { useAnalyticsDashboard } from "@/domains/analytics/use-cases/useAnalyticsDashboard";
const { t } = useI18n();
const { logout } = useAdminAccess();
const viewModel = useAnalyticsDashboard("pr-funnels");
const draft = viewModel.filters.draft;
const filterError = viewModel.filters.filterError;
const isRefreshing = viewModel.isRefreshing;
const isInitialLoading = viewModel.isInitialLoading;
const error = viewModel.error;
const refresh = viewModel.refresh;
const activeFilterSummary = viewModel.filters.activeFilterSummary;
</script>
