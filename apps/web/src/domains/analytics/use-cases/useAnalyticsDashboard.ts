import { computed, ref } from "vue";
import { useBIOverviewAnalytics } from "../queries/useBIOverviewAnalytics";
import { usePRDiscoveryAnalytics } from "../queries/usePRDiscoveryAnalytics";
import {
  usePRCreateFunnelAnalytics,
  usePRJoinFunnelAnalytics,
} from "../queries/usePRFunnelAnalytics";
import type { AnalyticsDashboardKind } from "../model/filters";
import { useAnalyticsFilters } from "./useAnalyticsFilters";

export type AnalyticsDashboardViewModel = ReturnType<typeof useAnalyticsDashboard>;

export const useAnalyticsDashboard = (kind: AnalyticsDashboardKind) => {
  const filters = useAnalyticsFilters();
  const isOverview = computed(() => kind === "overview");
  const isPRFunnels = computed(() => kind === "pr-funnels");
  const isPRDiscovery = computed(() => kind === "pr-discovery");

  const overviewQuery = useBIOverviewAnalytics(filters.applied, { enabled: isOverview });
  const createQuery = usePRCreateFunnelAnalytics(filters.applied, { enabled: isPRFunnels });
  const joinQuery = usePRJoinFunnelAnalytics(filters.applied, { enabled: isPRFunnels });
  const discoveryQuery = usePRDiscoveryAnalytics(filters.applied, { enabled: isPRDiscovery });
  const refreshPending = ref(false);

  const isInitialLoading = computed(
    () =>
      (isOverview.value && overviewQuery.isLoading.value) ||
      (isPRFunnels.value && (createQuery.isLoading.value || joinQuery.isLoading.value)) ||
      (isPRDiscovery.value && discoveryQuery.isLoading.value),
  );
  const error = computed(
    () =>
      (isOverview.value ? overviewQuery.error.value : null) ??
      (isPRFunnels.value ? (createQuery.error.value ?? joinQuery.error.value) : null) ??
      (isPRDiscovery.value ? discoveryQuery.error.value : null) ??
      null,
  );
  const isRefreshing = computed(
    () =>
      refreshPending.value ||
      (isOverview.value && overviewQuery.isFetching.value) ||
      (isPRFunnels.value && (createQuery.isFetching.value || joinQuery.isFetching.value)) ||
      (isPRDiscovery.value && discoveryQuery.isFetching.value),
  );

  const refresh = async (): Promise<void> => {
    refreshPending.value = true;
    try {
      const requests: Array<Promise<unknown>> = [];
      if (isOverview.value) requests.push(overviewQuery.refetch());
      if (isPRFunnels.value) requests.push(createQuery.refetch(), joinQuery.refetch());
      if (isPRDiscovery.value) requests.push(discoveryQuery.refetch());
      await Promise.all(requests);
    } finally {
      refreshPending.value = false;
    }
  };

  return {
    kind,
    filters,
    overviewQuery,
    createQuery,
    joinQuery,
    discoveryQuery,
    isOverview,
    isPRFunnels,
    isPRDiscovery,
    isInitialLoading,
    error,
    isRefreshing,
    refresh,
  };
};
